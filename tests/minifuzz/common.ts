import { afterEach, beforeEach, describe, it } from "node:test";
import { createSharedVolume, getTargetConfig, getTimeoutMs, minifuzz, startTarget, type TargetConfig } from "../common.js";
import type { ExternalProcess } from "../external-process.js";

const timeout = getTimeoutMs(5);

export function runMinifuzzTest(
  name: string,
  directory: string,
  steps: number,
  options: { highMemory?: boolean } = {},
) {
  const config = getTargetConfig();

  const effectiveConfig: TargetConfig =
    options.highMemory && Number.parseInt(config.memory) < 2048 ? { ...config, memory: "2048m" } : config;

  describe(`[minifuzz] ${config.name} - ${name}`, { timeout }, () => {
    let targetProc: ExternalProcess | null = null;
    let minifuzzProc: ExternalProcess | null = null;
    let sharedVolume = {
      name: "none",
      stop: () => {},
    };

    beforeEach(() => {
      sharedVolume = createSharedVolume(`-${config.name}-minifuzz-${name}`);
    });

    afterEach(async () => {
      try {
        await targetProc?.terminate();
        await minifuzzProc?.terminate();
      } catch {
        // ignore
      }

      sharedVolume.stop();
    });

    it(`should run ${name} minifuzz examples`, async () => {
      targetProc = await startTarget({
        timeout,
        sharedVolume: sharedVolume.name,
        config: effectiveConfig,
      });
      minifuzzProc = await minifuzz({
        timeout,
        dir: directory,
        stopAfter: steps,
        sharedVolume: sharedVolume.name,
      });

      await minifuzzProc.waitForMessage(/Stopping after.*as requested/);
      console.info("Minifuzz finished");
      await minifuzzProc.cleanExit;
      console.info("Minifuzz exited cleanly");
    });
  });
}
