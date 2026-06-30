import assert from "node:assert/strict";
import test from "node:test";
import { GONKAGATE_PROVIDER_ID } from "../../src/constants.js";
import { createGonkagateProviderMergePlan } from "../../src/install/config-mutations.js";
import { PI_MODELS_JSON_OWNERSHIP } from "../../src/install/ownership.js";
import { createGonkagateProviderConfig } from "../../src/install/provider-config.js";
import { TEST_MODELS } from "../model-fixtures.js";

test("Pi ownership model declares only providers.gonkagate", () => {
  assert.deepEqual(PI_MODELS_JSON_OWNERSHIP, {
    ownedPath: ["providers", GONKAGATE_PROVIDER_ID],
    preserve: "everything_else",
    target: "models_json",
  });
});

test("ownership replacement changes only the managed provider", () => {
  const existingProvider = { apiKey: "$EXISTING", nested: { keep: true } };
  const topLevel = { keep: ["as", "json"] };
  const plan = createGonkagateProviderMergePlan(
    {
      defaultProvider: "anthropic",
      featureFlags: topLevel,
      providers: {
        existing: existingProvider,
        [GONKAGATE_PROVIDER_ID]: { stale: true },
      },
    },
    "{}\n",
    TEST_MODELS,
  );

  assert.equal(plan.config.defaultProvider, "anthropic");
  assert.deepEqual(plan.config.featureFlags, topLevel);
  assert.deepEqual(
    (plan.config.providers as Record<string, unknown>).existing,
    existingProvider,
  );
  assert.deepEqual(
    (plan.config.providers as Record<string, unknown>)[GONKAGATE_PROVIDER_ID],
    createGonkagateProviderConfig(TEST_MODELS),
  );
});
