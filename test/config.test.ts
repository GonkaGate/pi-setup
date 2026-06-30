import assert from "node:assert/strict";
import test from "node:test";
import {
  GONKAGATE_API_KEY_BINDING,
  GONKAGATE_BASE_URL,
  GONKAGATE_PI_API,
  GONKAGATE_PROVIDER_ID,
} from "../src/constants.js";
import {
  createGonkagateProviderConfig,
  mergeGonkagateProviderConfig,
  parseModelsConfig,
} from "../src/config.js";
import { TEST_MODELS } from "./model-fixtures.js";

test("creates the managed GonkaGate Pi provider", () => {
  const provider = createGonkagateProviderConfig(TEST_MODELS);

  assert.equal(provider.baseUrl, GONKAGATE_BASE_URL);
  assert.equal(provider.api, GONKAGATE_PI_API);
  assert.equal(provider.apiKey, GONKAGATE_API_KEY_BINDING);
  assert.deepEqual(
    provider.models.map((model) => model.id),
    TEST_MODELS.map((model) => model.id),
  );
});

test("merge preserves unrelated Pi config and upserts GonkaGate provider", () => {
  const merged = mergeGonkagateProviderConfig(
    {
      defaultProvider: "anthropic",
      providers: {
        anthropic: {
          apiKey: "$ANTHROPIC_API_KEY",
        },
      },
    },
    TEST_MODELS,
  );

  assert.equal(merged.defaultProvider, "anthropic");
  assert.deepEqual((merged.providers as Record<string, unknown>).anthropic, {
    apiKey: "$ANTHROPIC_API_KEY",
  });
  assert.equal(
    typeof (merged.providers as Record<string, unknown>)[GONKAGATE_PROVIDER_ID],
    "object",
  );
});

test("parse rejects non-object config", () => {
  assert.throws(() => parseModelsConfig("[]"), /must be a JSON object/);
  assert.throws(() => parseModelsConfig("42"), /must be a JSON object/);
});

test("parse accepts plain object config", () => {
  assert.deepEqual(parseModelsConfig('{"providers":{}}\n'), { providers: {} });
});

test("merge replaces scalar providers while preserving top-level config", () => {
  const merged = mergeGonkagateProviderConfig(
    {
      defaultProvider: "anthropic",
      providers: "stale",
    },
    TEST_MODELS,
  );

  assert.equal(merged.defaultProvider, "anthropic");
  assert.equal(
    typeof (merged.providers as Record<string, unknown>)[GONKAGATE_PROVIDER_ID],
    "object",
  );
});
