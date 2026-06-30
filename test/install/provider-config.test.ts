import assert from "node:assert/strict";
import test from "node:test";
import {
  GONKAGATE_API_KEY_BINDING,
  GONKAGATE_BASE_URL,
  GONKAGATE_PI_API,
  GONKAGATE_PROVIDER_ID,
  GONKAGATE_PROVIDER_NAME,
} from "../../src/constants.js";
import { createGonkagateProviderConfig } from "../../src/install/provider-config.js";
import { TEST_MODELS } from "../model-fixtures.js";

test("provider config is generated from fetched models", () => {
  const provider = createGonkagateProviderConfig(TEST_MODELS);

  assert.deepEqual(provider, {
    name: GONKAGATE_PROVIDER_NAME,
    baseUrl: GONKAGATE_BASE_URL,
    api: GONKAGATE_PI_API,
    apiKey: GONKAGATE_API_KEY_BINDING,
    models: TEST_MODELS.map((model) => ({
      id: model.id,
      name: model.name,
    })),
  });
  assert.equal(GONKAGATE_PROVIDER_ID, "gonkagate");
});

test("provider config never embeds a raw GonkaGate key", () => {
  const provider = createGonkagateProviderConfig(TEST_MODELS);

  assert.equal(provider.apiKey, "$GONKAGATE_API_KEY");
  assert.doesNotMatch(JSON.stringify(provider), /gp-/);
});
