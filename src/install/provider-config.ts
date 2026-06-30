import {
  GONKAGATE_API_KEY_BINDING,
  GONKAGATE_BASE_URL,
  GONKAGATE_PI_API,
  GONKAGATE_PROVIDER_NAME,
  type GonkaGateModel,
} from "../constants.js";

export interface PiProviderModelConfig {
  readonly id: string;
  readonly name: string;
}

export interface PiProviderConfig {
  readonly api: string;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly models: readonly PiProviderModelConfig[];
  readonly name: string;
}

export function createGonkagateProviderConfig(
  models: readonly GonkaGateModel[],
): PiProviderConfig {
  return {
    name: GONKAGATE_PROVIDER_NAME,
    baseUrl: GONKAGATE_BASE_URL,
    api: GONKAGATE_PI_API,
    apiKey: GONKAGATE_API_KEY_BINDING,
    models: models.map((model) => ({
      id: model.id,
      name: model.name,
    })),
  };
}
