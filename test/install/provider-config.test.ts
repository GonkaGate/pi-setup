import assert from "node:assert/strict";
import test from "node:test";
import {
  CURATED_MODELS,
  GONKAGATE_API_KEY_BINDING,
  GONKAGATE_BASE_URL,
  GONKAGATE_PI_API,
  GONKAGATE_PROVIDER_ID,
  GONKAGATE_PROVIDER_NAME,
} from "../../src/constants.js";
import { createGonkagateProviderConfig } from "../../src/install/provider-config.js";

test("provider config is generated from the curated registry", () => {
  const provider = createGonkagateProviderConfig();

  assert.deepEqual(provider, {
    name: GONKAGATE_PROVIDER_NAME,
    baseUrl: GONKAGATE_BASE_URL,
    api: GONKAGATE_PI_API,
    apiKey: GONKAGATE_API_KEY_BINDING,
    models: CURATED_MODELS.map((model) => ({
      id: model.id,
      name: model.name,
    })),
  });
  assert.equal(GONKAGATE_PROVIDER_ID, "gonkagate");
});

test("provider config never embeds a raw GonkaGate key", () => {
  const provider = createGonkagateProviderConfig();

  assert.equal(provider.apiKey, "$GONKAGATE_API_KEY");
  assert.doesNotMatch(JSON.stringify(provider), /gp-/);
});
