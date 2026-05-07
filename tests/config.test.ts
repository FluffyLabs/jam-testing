import assert from "node:assert";
import { describe, it } from "node:test";
import { getTargetConfig } from "./common.js";

describe("getTargetConfig", () => {
  it("throws when env vars are missing", () => {
    delete process.env.TARGET_NAME;
    delete process.env.TARGET_IMAGE;
    delete process.env.TARGET_CMD;
    assert.throws(() => getTargetConfig(), /TARGET_NAME and TARGET_IMAGE/);
  });

  it("parses env vars correctly", () => {
    process.env.TARGET_NAME = "testteam";
    process.env.TARGET_IMAGE = "some/image:latest";
    process.env.TARGET_CMD = "fuzz {TARGET_SOCK}";
    process.env.TARGET_ENV = "FOO=bar BAZ=qux";
    process.env.TARGET_MEMORY = "1024m";
    process.env.TARGET_READINESS_PATTERN = "Ready";

    const config = getTargetConfig();
    assert.strictEqual(config.name, "testteam");
    assert.strictEqual(config.image, "some/image:latest");
    assert.strictEqual(config.cmd, "fuzz {TARGET_SOCK}");
    assert.strictEqual(config.env, "FOO=bar BAZ=qux");
    assert.strictEqual(config.memory, "1024m");
    assert.strictEqual(config.readinessPattern, "Ready");
  });

  it("uses defaults for optional fields", () => {
    process.env.TARGET_NAME = "minimal";
    process.env.TARGET_IMAGE = "img:v1";
    delete process.env.TARGET_CMD;
    delete process.env.TARGET_ENV;
    delete process.env.TARGET_MEMORY;
    delete process.env.TARGET_READINESS_PATTERN;

    const config = getTargetConfig();
    assert.strictEqual(config.cmd, "");
    assert.strictEqual(config.env, "");
    assert.strictEqual(config.memory, "512m");
    assert.strictEqual(config.readinessPattern, "");
  });
});
