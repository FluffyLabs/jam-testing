import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

/**
 * Containers we have started in this process. Tracked so we can force-remove
 * them on shutdown even if the docker CLI client has been SIGKILLed (which
 * orphans the container under dockerd — `--rm` never fires in that case).
 */
const knownContainers = new Set<string>();

export const CONTAINER_LABEL = "jam-testing=1";

export function uniqueName(role: string): string {
  const suffix = randomBytes(4).toString("hex");
  return `jam-test-${role}-${process.pid}-${suffix}`;
}

export function registerContainer(name: string): void {
  knownContainers.add(name);
}

export function unregisterContainer(name: string): void {
  knownContainers.delete(name);
}

/**
 * Synchronously force-remove a container and drop it from the registry.
 * Best-effort: swallows errors (container may already be gone).
 */
export function removeContainer(name: string): void {
  knownContainers.delete(name);
  try {
    execFileSync("docker", ["rm", "-f", name], {
      stdio: "pipe",
      timeout: 10_000,
    });
  } catch {
    // container may already be removed, or docker unreachable
  }
}

/**
 * Synchronously force-remove all tracked containers. Used by exit handlers.
 */
function removeAllTracked(): void {
  if (knownContainers.size === 0) return;
  const names = Array.from(knownContainers);
  knownContainers.clear();
  try {
    execFileSync("docker", ["rm", "-f", ...names], {
      stdio: "pipe",
      timeout: 15_000,
    });
  } catch {
    // best-effort
  }
}

let handlersInstalled = false;

export function installShutdownHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  process.on("exit", removeAllTracked);

  // SIGINT / SIGTERM: do sync cleanup, then exit with conventional signal code.
  // Registering a listener disables Node's default exit-on-signal behavior, so
  // we must call process.exit ourselves.
  const onSignal = (signal: NodeJS.Signals) => {
    removeAllTracked();
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception, cleaning up containers:", err);
    removeAllTracked();
    process.exit(1);
  });
}

installShutdownHandlers();
