import { type ChildProcessWithoutNullStreams, execSync, spawn } from "node:child_process";
import { promises, setTimeout } from "node:timers";
import { registerContainer, removeContainer, unregisterContainer } from "./container-registry.js";

const SHUTDOWN_GRACE_PERIOD = 5_000;

export class ExternalProcess {
  static spawn(processName: string, command: string, ...args: string[]): ExternalProcess {
    return ExternalProcess.spawnWithContainer(processName, undefined, command, ...args);
  }

  /**
   * Like spawn, but tags the process with a docker container name. The name is
   * registered with the container registry so it can be force-removed on
   * shutdown — guarding against orphaned containers when the docker CLI client
   * is SIGKILLed and `--rm` never fires.
   */
  static spawnWithContainer(
    processName: string,
    containerName: string | undefined,
    command: string,
    ...args: string[]
  ): ExternalProcess {
    console.log(`Spawning ${processName}: "${command} ${args.join(" ")}"`);
    const spawned = spawn(command, args, {
      cwd: process.cwd(),
    });
    spawned.stdout.on("data", (data: Buffer) => {
      console.info(`[${processName}] ${data.toString()}`);
    });
    spawned.stderr.on("data", (data: Buffer) => {
      console.error(`[${processName}] ${data.toString()}`);
    });
    if (containerName) {
      registerContainer(containerName);
    }
    return new ExternalProcess(processName, spawned, args, containerName);
  }

  public readonly cleanExit: Promise<void>;
  private killedIntentionally = false;

  private constructor(
    private readonly processName: string,
    private readonly spawned: ChildProcessWithoutNullStreams,
    private readonly args: string[],
    private readonly containerName: string | undefined,
  ) {
    this.cleanExit = new Promise((resolve, reject) => {
      spawned.on("error", (err) => {
        if (containerName) unregisterContainer(containerName);
        reject(`[${this.processName}] Failed to start process: ${err.message}`);
      });

      spawned.on("exit", (code, signal) => {
        if (containerName) unregisterContainer(containerName);
        if (code === 0) {
          resolve();
        } else if (this.killedIntentionally) {
          console.error(`[${this.processName}] Process terminated intentionally.`);
          resolve();
        } else if (signal === "SIGKILL" || code === 137) {
          // SIGKILL or exit code 137 (128+9) without intentional kill strongly suggests OOM.
          const oomDetail = this.checkDockerOom();
          reject(
            `[${this.processName}] Process was killed by SIGKILL (code: ${code}, signal: ${signal}). ` +
              `This most likely indicates an out-of-memory (OOM) kill.${oomDetail}`,
          );
        } else if (code !== 143 && signal !== "SIGTERM" && signal !== "SIGPIPE") {
          reject(`[${this.processName}] Process exited (code: ${code}, signal: ${signal})`);
        } else {
          console.error(`[${this.processName}] Process had to be killed.`);
          resolve();
        }
      });
    });
  }

  /**
   * Try to get OOM details from Docker if this was a `docker run` command.
   * Returns additional detail string to append to error messages.
   */
  private checkDockerOom(): string {
    if (this.args[0] !== "run") return "";

    // Find the container image and try to get memory stats from dmesg
    try {
      const dmesg = execSync(
        "dmesg --time-format iso 2>/dev/null | tail -30 || journalctl -k -n 30 --no-pager 2>/dev/null || true",
        {
          timeout: 5_000,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      const oomLines = dmesg.split("\n").filter((line) => /oom|out of memory|killed process/i.test(line));
      if (oomLines.length > 0) {
        return `\nKernel OOM messages:\n${oomLines.join("\n")}`;
      }
    } catch {
      // dmesg may not be available, that's fine
    }
    return "";
  }

  async waitForMessage(pattern: RegExp, check: (match: RegExpMatchArray) => boolean = () => true) {
    return new Promise<string>((resolve, reject) => {
      this.spawned.on("exit", () => reject("Exited"));
      this.spawned.on("error", () => reject("Error"));
      this.spawned.stdout.on("data", (data: Buffer) => {
        const output = data.toString();

        const match = pattern.exec(output);
        if (match !== null) {
          if (check(match)) {
            resolve(output);
          }
        }
      });
    });
  }

  async terminate() {
    if (this.killedIntentionally) {
      console.warn(`[${this.processName}] Already terminating. Ignoring.`);
      return;
    }
    this.killedIntentionally = true;
    console.log(`[${this.processName}] Terminating`);

    // Force-remove the container directly via dockerd. Don't rely on signal
    // forwarding through the local CLI client — that's unreliable (SIGKILL on
    // the CLI just orphans the container).
    if (this.containerName) {
      removeContainer(this.containerName);
    }

    // Then wind down the local CLI process.
    this.spawned.stdin?.end();
    this.spawned.stdout?.destroy();
    this.spawned.stderr?.destroy();
    this.spawned.kill("SIGTERM");

    const grace = promises.setTimeout(SHUTDOWN_GRACE_PERIOD);
    await grace;
    if (this.spawned.exitCode === null) {
      console.error(`[${this.processName}] shutdown timing out. Killing`);
      setImmediate(() => {
        this.spawned.kill("SIGKILL");
      });
    }
  }

  terminateAfter(timeoutMs: number) {
    const timeout = setTimeout(() => {
      console.error(`[${this.processName}] Test timing out, terminating the process.`);
      this.terminate();
    }, timeoutMs);
    this.spawned.on("exit", () => {
      clearTimeout(timeout);
    });
    return this;
  }
}
