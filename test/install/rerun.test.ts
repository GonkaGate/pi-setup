import assert from "node:assert/strict";
import test from "node:test";
import { CURATED_MODELS, GONKAGATE_PROVIDER_ID } from "../../src/constants.js";
import { installGonkagateProvider } from "../../src/install/index.js";
import { createGonkagateProviderConfig } from "../../src/install/provider-config.js";
import { createPiInstallHarness } from "./harness.js";

test("unchanged reruns are idempotent and create no backup", async () => {
  const harness = await createPiInstallHarness();

  assert.equal(
    (await installGonkagateProvider(harness.configPath, false)).changed,
    true,
  );
  assert.equal(
    (await installGonkagateProvider(harness.configPath, false)).changed,
    false,
  );
  assert.deepEqual(await harness.listBackups(), []);
});

test("changed reruns back up stale managed provider before replacement", async () => {
  const harness = await createPiInstallHarness();
  await harness.writeConfigText(
    `${JSON.stringify({
      providers: {
        existing: { apiKey: "$EXISTING" },
        [GONKAGATE_PROVIDER_ID]: { baseUrl: "https://old.example.test" },
      },
    })}\n`,
  );

  const result = await installGonkagateProvider(harness.configPath, false);
  const config = await harness.readConfig();

  assert.equal(result.changed, true);
  assert.equal(result.backupPath !== undefined, true);
  assert.deepEqual(await harness.listBackups(), [result.backupPath]);
  assert.deepEqual((config.providers as Record<string, unknown>).existing, {
    apiKey: "$EXISTING",
  });
  assert.deepEqual(
    (config.providers as Record<string, unknown>)[GONKAGATE_PROVIDER_ID],
    createGonkagateProviderConfig(),
  );
});

test("rerun refreshes the managed catalog without touching unrelated config", async () => {
  const harness = await createPiInstallHarness();
  await harness.writeConfigText(
    `${JSON.stringify({
      customTopLevel: { keep: true },
      providers: {
        other: { apiKey: "$OTHER" },
        [GONKAGATE_PROVIDER_ID]: {
          models: [{ id: "old/model", name: "Old Model" }],
        },
      },
    })}\n`,
  );

  await installGonkagateProvider(harness.configPath, false);

  const config = await harness.readConfig();
  const providers = config.providers as Record<string, unknown>;
  const managed = providers[GONKAGATE_PROVIDER_ID] as {
    models: Array<{ id: string }>;
  };
  assert.deepEqual(config.customTopLevel, { keep: true });
  assert.deepEqual(providers.other, { apiKey: "$OTHER" });
  assert.deepEqual(
    managed.models.map((model) => model.id),
    CURATED_MODELS.map((model) => model.id),
  );
});
