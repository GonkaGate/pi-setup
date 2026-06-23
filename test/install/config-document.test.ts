import assert from "node:assert/strict";
import test from "node:test";
import { GONKAGATE_PROVIDER_ID } from "../../src/constants.js";
import { InstallError } from "../../src/install/errors.js";
import { installGonkagateProvider } from "../../src/install/index.js";
import { createPiInstallHarness } from "./harness.js";

test("missing models config is treated as an empty object", async () => {
  const harness = await createPiInstallHarness();

  const result = await installGonkagateProvider(harness.configPath, true);

  assert.equal(result.changed, true);
  assert.equal(result.configPath, harness.configPath);
  await harness.assertNoTargetWrite();
});

test("invalid JSON fails without backup or write", async () => {
  const harness = await createPiInstallHarness();
  const original = "{bad json}\n";
  await harness.writeConfigText(original);

  await assert.rejects(
    installGonkagateProvider(harness.configPath, false),
    isInstallError("invalid_config", harness.configPath),
  );

  assert.equal(await harness.readConfigText(), original);
  assert.deepEqual(await harness.listBackups(), []);
});

test("non-object JSON fails without backup or write", async () => {
  const harness = await createPiInstallHarness();
  const original = "42\n";
  await harness.writeConfigText(original);

  await assert.rejects(
    installGonkagateProvider(harness.configPath, false),
    isInstallError("invalid_config", harness.configPath),
  );

  assert.equal(await harness.readConfigText(), original);
  assert.deepEqual(await harness.listBackups(), []);
});

test("scalar providers are replaced while top-level config is preserved", async () => {
  const harness = await createPiInstallHarness();
  await harness.writeConfigText(
    `${JSON.stringify({ defaultProvider: "anthropic", providers: "stale" })}\n`,
  );

  await installGonkagateProvider(harness.configPath, false);

  const config = await harness.readConfig();
  assert.equal(config.defaultProvider, "anthropic");
  assert.equal(
    typeof (config.providers as Record<string, unknown>)[GONKAGATE_PROVIDER_ID],
    "object",
  );
});

function isInstallError(errorCode: InstallError["errorCode"], path: string) {
  return (error: unknown): boolean => {
    assert.equal(error instanceof InstallError, true);
    assert.equal((error as InstallError).errorCode, errorCode);
    assert.match(
      (error as InstallError).message,
      new RegExp(escapeRegExp(path)),
    );
    return true;
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
