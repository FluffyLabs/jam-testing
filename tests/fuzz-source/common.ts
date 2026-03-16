import { afterEach, beforeEach, describe, it } from "node:test";
import {
  chmodSocket,
  createSharedVolume,
  fuzzSource,
  getSourceConfig,
  getTargetConfig,
  getTimeoutMs,
  startTarget,
} from "../common.js";
import type { ExternalProcess } from "../external-process.js";

const timeout = getTimeoutMs(30);

export function runFuzzSourceTest(name: string) {
  const targetConfig = getTargetConfig();
  const sourceConfig = getSourceConfig();

  describe(`[fuzz-source] ${sourceConfig.name} → ${targetConfig.name} - ${name}`, { timeout }, () => {
    let targetProc: ExternalProcess | null = null;
    let sourceProc: ExternalProcess | null = null;
    let sharedVolume = {
      name: "none",
      stop: () => {},
    };

    beforeEach(() => {
      sharedVolume = createSharedVolume(`-${targetConfig.name}-fuzz-${name}`);
    });

    afterEach(async () => {
      try {
        await targetProc?.terminate();
        await sourceProc?.terminate();
      } catch {
        // ignore
      }

      sharedVolume.stop();
    });

    it(`should run ${sourceConfig.name} fuzzer against ${targetConfig.name}`, async () => {
      targetProc = await startTarget({
        timeout,
        sharedVolume: sharedVolume.name,
        config: targetConfig,
      });
      chmodSocket(sharedVolume.name);
      sourceProc = await fuzzSource({
        timeout,
        sharedVolume: sharedVolume.name,
        config: sourceConfig,
      });

      await sourceProc.cleanExit;
      console.info("Fuzz source completed successfully");
    });
  });
}
