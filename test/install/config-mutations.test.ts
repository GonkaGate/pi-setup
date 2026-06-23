import assert from "node:assert/strict";
import test from "node:test";
import { GONKAGATE_PROVIDER_ID } from "../../src/constants.js";
import { stringifyModelsConfig } from "../../src/config.js";
import { createGonkagateProviderMergePlan } from "../../src/install/config-mutations.js";
import { createGonkagateProviderConfig } from "../../src/install/provider-config.js";

test("merge plan creates a new GonkaGate provider config", () => {
  const plan = createGonkagateProviderMergePlan({}, undefined);

  assert.equal(plan.changed, true);
  assert.deepEqual(plan.config, {
    providers: {
      [GONKAGATE_PROVIDER_ID]: createGonkagateProviderConfig(),
    },
  });
});

test("merge plan preserves unrelated providers and top-level values", () => {
  const plan = createGonkagateProviderMergePlan(
    {
      defaultProvider: "anthropic",
      providers: {
        anthropic: { apiKey: "$ANTHROPIC_API_KEY" },
      },
    },
    "{}\n",
  );

  assert.equal(plan.config.defaultProvider, "anthropic");
  assert.deepEqual(
    (plan.config.providers as Record<string, unknown>).anthropic,
    {
      apiKey: "$ANTHROPIC_API_KEY",
    },
  );
});

test("merge plan replaces stale managed GonkaGate provider", () => {
  const plan = createGonkagateProviderMergePlan(
    {
      providers: {
        [GONKAGATE_PROVIDER_ID]: { baseUrl: "https://old.example.test" },
      },
    },
    "{}\n",
  );

  assert.deepEqual(
    (plan.config.providers as Record<string, unknown>)[GONKAGATE_PROVIDER_ID],
    createGonkagateProviderConfig(),
  );
});

test("merge plan emits deterministic two-space JSON with newline", () => {
  const plan = createGonkagateProviderMergePlan({}, undefined);

  assert.equal(plan.text, `${JSON.stringify(plan.config, null, 2)}\n`);
  assert.match(plan.text, /\n  "providers":/);
  assert.match(plan.text, /\n$/);
});

test("merge plan reports idempotent no-op before filesystem work", () => {
  const currentConfig = {
    providers: {
      [GONKAGATE_PROVIDER_ID]: createGonkagateProviderConfig(),
    },
  };
  const currentText = stringifyModelsConfig(currentConfig);
  const plan = createGonkagateProviderMergePlan(currentConfig, currentText);

  assert.equal(plan.changed, false);
  assert.equal(plan.text, currentText);
});
