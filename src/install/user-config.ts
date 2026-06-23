import type { JsonObject } from "../config.js";
import { GONKAGATE_PROVIDER_ID } from "../constants.js";

export interface JsonMergePlan {
  readonly changed: boolean;
  readonly config: JsonObject;
  readonly text: string;
}

export function createAuthMergePlan(
  existingConfig: JsonObject,
  existingText: string | undefined,
  apiKey: string,
): JsonMergePlan {
  const config = {
    ...existingConfig,
    [GONKAGATE_PROVIDER_ID]: {
      type: "api_key",
      key: apiKey,
    },
  };
  const text = stringifyJson(config);

  return { changed: existingText !== text, config, text };
}

export function createSettingsMergePlan(
  existingConfig: JsonObject,
  existingText: string | undefined,
  selectedModelId: string,
): JsonMergePlan {
  const config = {
    ...existingConfig,
    defaultProvider: GONKAGATE_PROVIDER_ID,
    defaultModel: selectedModelId,
  };
  const text = stringifyJson(config);

  return { changed: existingText !== text, config, text };
}

export function parseJsonObject(text: string, label: string): JsonObject {
  const parsed = JSON.parse(text) as unknown;

  if (!isJsonObject(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed;
}

function stringifyJson(config: JsonObject): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
