import type { GonkaGateModel } from "../constants.js";
import {
  type JsonObject,
  mergeGonkagateProviderConfig,
  stringifyModelsConfig,
} from "../config.js";

export interface ModelsConfigMergePlan {
  readonly changed: boolean;
  readonly config: JsonObject;
  readonly text: string;
}

export function createGonkagateProviderMergePlan(
  existingConfig: JsonObject,
  existingText: string | undefined,
  models: readonly GonkaGateModel[],
): ModelsConfigMergePlan {
  const config = mergeGonkagateProviderConfig(existingConfig, models);
  const text = stringifyModelsConfig(config);

  return {
    changed: existingText !== text,
    config,
    text,
  };
}
