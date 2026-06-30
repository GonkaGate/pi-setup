import { PI_MODELS_JSON_OWNERSHIP } from "./install/ownership.js";
import { createGonkagateProviderConfig } from "./install/provider-config.js";
import type { GonkaGateModel } from "./constants.js";
export {
  createGonkagateProviderConfig,
  type PiProviderConfig,
  type PiProviderModelConfig,
} from "./install/provider-config.js";

export type JsonObject = Record<string, unknown>;

export function parseModelsConfig(text: string): JsonObject {
  const parsed = JSON.parse(text) as unknown;

  if (!isJsonObject(parsed)) {
    throw new Error("Pi models config must be a JSON object.");
  }

  return parsed;
}

export function mergeGonkagateProviderConfig(
  config: JsonObject,
  models: readonly GonkaGateModel[],
): JsonObject {
  const providers = isJsonObject(config.providers) ? config.providers : {};
  const [, providerId] = PI_MODELS_JSON_OWNERSHIP.ownedPath;

  return {
    ...config,
    providers: {
      ...providers,
      [providerId]: createGonkagateProviderConfig(models),
    },
  };
}

export function stringifyModelsConfig(config: JsonObject): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
