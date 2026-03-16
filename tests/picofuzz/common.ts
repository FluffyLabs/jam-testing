import { afterEach, beforeEach, describe, it } from "node:test";
import { createSharedVolume, getTargetConfig, getTimeoutMs, picofuzz, startTarget } from "../common.js";
import type { ExternalProcess } from "../external-process.js";

const timeout = getTimeoutMs(10);

export function runPicofuzzTest(
  name: string,
  directory: string,
  {
    repeat = 10,
    ignore = [],
  }: {
    repeat?: number;
    ignore?: string[];
  } = {},
) {
  const config = getTargetConfig();

  describe(`[picofuzz] ${config.name} - ${name}`, { timeout }, () => {
    let targetProc: ExternalProcess | null = null;
    let picofuzzProc: ExternalProcess | null = null;
    let sharedVolume = {
      name: "none",
      stop: () => {},
    };

    beforeEach(() => {
      sharedVolume = createSharedVolume(`-${config.name}-${name}`);
    });

    afterEach(async () => {
      // terminate the processes
      try {
        await targetProc?.terminate();
        await picofuzzProc?.terminate();
      } catch {
        // ignore
      }

      sharedVolume.stop();
    });

    it(`should run ${name} tests`, async () => {
      targetProc = await startTarget({
        timeout,
        sharedVolume: sharedVolume.name,
        config,
      });
      picofuzzProc = await picofuzz({
        timeout,
        dir: directory,
        repeat,
        sharedVolume: sharedVolume.name,
        statsFile: `${name}.csv`,
        ignore,
      });

      await picofuzzProc.cleanExit;
      console.info("Importing successful");
    });
  });
}
