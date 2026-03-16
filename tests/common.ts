import { execSync } from "node:child_process";
import { ExternalProcess } from "./external-process.js";

const SOCKET_PATH = "/shared/jam_target.sock";
const SHARED_VOLUME = "jam-ipc-volume";

/**
 * Read test timeout from TIMEOUT_MINUTES env var (set by GHA workflows).
 * Falls back to `defaultMinutes` for local development.
 */
export function getTimeoutMs(defaultMinutes: number): number {
  const envVal = process.env.TIMEOUT_MINUTES;
  const minutes = envVal ? Number(envVal) : defaultMinutes;
  return minutes * 60 * 1000;
}

const DOCKER_OPTIONS = (mem = "512m") => [
  "--network",
  "none",
  "--cpu-shares",
  "2048",
  "--cpu-quota",
  "-1",
  "--memory",
  mem,
  "--memory-swap",
  "0m",
  "--shm-size",
  "256m",
  "--ulimit",
  "nofile=1024:1024",
  "--ulimit",
  "nproc=1024:1024",
  "--stop-signal=SIGKILL",
  "--stop-timeout=5",
];

export interface SourceConfig {
  name: string;
  image: string;
  cmd: string;
  memory: string;
  user: string;
}

export function getSourceConfig(): SourceConfig {
  const name = process.env.SOURCE_NAME;
  const image = process.env.SOURCE_IMAGE;
  const cmd = process.env.SOURCE_CMD;

  if (!name || !image || !cmd) {
    throw new Error("SOURCE_NAME, SOURCE_IMAGE, and SOURCE_CMD environment variables are required");
  }

  return {
    name,
    image,
    cmd,
    memory: process.env.SOURCE_MEMORY || "512m",
    user: process.env.SOURCE_USER || "",
  };
}

export interface TargetConfig {
  name: string;
  image: string;
  cmd: string;
  env: string;
  readinessPattern: string;
  memory: string;
}

export function getTargetConfig(): TargetConfig {
  const name = process.env.TARGET_NAME;
  const image = process.env.TARGET_IMAGE;
  const cmd = process.env.TARGET_CMD;

  if (!name || !image || !cmd) {
    throw new Error("TARGET_NAME, TARGET_IMAGE, and TARGET_CMD environment variables are required");
  }

  return {
    name,
    image,
    cmd,
    env: process.env.TARGET_ENV || "",
    readinessPattern: process.env.TARGET_READINESS_PATTERN || "",
    memory: process.env.TARGET_MEMORY || "512m",
  };
}

export function createSharedVolume(name = "") {
  const volumeName = `${SHARED_VOLUME}${name}`;
  // Clean up any existing volume and create a fresh one
  try {
    execSync(`docker volume rm ${volumeName}`);
  } catch {
    // Volume might not exist, ignore
  }
  execSync(`docker volume create ${volumeName}`);

  // Initialize the volume with proper permissions
  execSync(`docker run --rm --network none -v ${volumeName}:/shared alpine sh -c "mkdir -p /shared && chmod 777 /shared"`);

  return {
    name: volumeName,
    stop: () => {
      // Clean up the shared volume
      try {
        execSync(`docker volume rm ${volumeName}`);
      } catch {
        // Volume might be in use, ignore
      }
    },
  };
}

function buildEnvArgs(envStr: string): string[] {
  if (!envStr.trim()) return [];
  return envStr
    .trim()
    .split(/\s+/)
    .flatMap((pair) => ["-e", pair]);
}

function buildCmdArgs(cmdTemplate: string): string[] {
  const cmd = cmdTemplate.replace(/\{TARGET_SOCK\}/g, SOCKET_PATH);
  return cmd.split(/\s+/).filter((s) => s.length > 0);
}

async function waitForSocket(volumeName: string, maxWaitMs = 60_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      execSync(`docker run --rm --network none -v ${volumeName}:/shared alpine test -S /shared/jam_target.sock`, {
        timeout: 5000,
        stdio: "pipe",
      });
      // Socket exists, small delay for listen() to complete
      await new Promise((r) => setTimeout(r, 500));
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Socket did not appear within ${maxWaitMs}ms`);
}

export function chmodSocket(volumeName: string) {
  execSync(`docker run --rm --network none -v ${volumeName}:/shared alpine chmod 777 ${SOCKET_PATH}`, {
    timeout: 10_000,
    stdio: "pipe",
  });
}

export async function startTarget({
  timeout,
  sharedVolume = SHARED_VOLUME,
  config,
}: {
  timeout: number;
  sharedVolume?: string;
  config: TargetConfig;
}) {
  const envArgs = buildEnvArgs(config.env);
  const cmdArgs = buildCmdArgs(config.cmd);

  const proc = ExternalProcess.spawn(
    config.name,
    "docker",
    "run",
    "--rm",
    ...envArgs,
    ...DOCKER_OPTIONS(config.memory),
    "-v",
    `${sharedVolume}:/shared`,
    config.image,
    ...cmdArgs,
  ).terminateAfter(timeout - 30_000);

  // Wait for readiness
  if (config.readinessPattern) {
    await proc.waitForMessage(new RegExp(config.readinessPattern));
  } else {
    await waitForSocket(sharedVolume);
  }

  return proc;
}

export async function minifuzz({
  dir,
  stopAfter = 1000,
  sharedVolume = SHARED_VOLUME,
  timeout,
}: {
  dir: string;
  stopAfter?: number;
  sharedVolume?: string;
  timeout: number;
}) {
  return ExternalProcess.spawn(
    "minifuzz",
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
    "-v",
    `${process.cwd()}/picofuzz-conformance-data:/app/picofuzz-conformance-data:ro`,
    "-v",
    `${process.cwd()}/minifuzz-traces:/app/minifuzz-traces:ro`,
    "-v",
    `${sharedVolume}:/shared`,
    "minifuzz",
    "--trace-dir",
    `/app/${dir}`,
    "--target-sock",
    SOCKET_PATH,
    "--stop-after",
    `${stopAfter}`,
    "--spec",
    "tiny",
  ).terminateAfter(timeout - 10_000);
}

export async function fuzzSource({
  sharedVolume = SHARED_VOLUME,
  timeout,
  config,
}: {
  sharedVolume?: string;
  timeout: number;
  config: SourceConfig;
}) {
  const cmdArgs = buildCmdArgs(config.cmd);
  const userArgs = config.user ? ["--user", config.user] : [];

  return ExternalProcess.spawn(
    config.name,
    "docker",
    "run",
    "--rm",
    ...userArgs,
    ...DOCKER_OPTIONS(config.memory),
    "-v",
    `${sharedVolume}:/shared`,
    config.image,
    ...cmdArgs,
  ).terminateAfter(timeout - 10_000);
}

export async function picofuzz({
  dir,
  repeat = 1,
  sharedVolume = SHARED_VOLUME,
  timeout,
  statsFile,
  ignore = [],
}: {
  dir: string;
  repeat?: number;
  sharedVolume?: string;
  timeout: number;
  statsFile?: string;
  ignore?: string[];
}) {
  return ExternalProcess.spawn(
    "picofuzz",
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
    "-v",
    `${process.cwd()}/picofuzz-stf-data:/app/picofuzz-stf-data:ro`,
    "-v",
    `${process.cwd()}/picofuzz-result:/app/picofuzz-result`,
    "-v",
    `${sharedVolume}:/shared`,
    "picofuzz",
    ...(statsFile ? [`--stats=/app/picofuzz-result/${statsFile}`] : []),
    ...ignore.flatMap((f) => ["--ignore", f]),
    `--repeat=${repeat}`,
    `/app/${dir}`,
    SOCKET_PATH,
  ).terminateAfter(timeout - 10_000);
}
