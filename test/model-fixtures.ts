import type { GonkaGateModel } from "../src/constants.js";
import {
  createNodeInstallDependencies,
  type InstallDependencies,
} from "../src/install/deps.js";

export const TEST_MODELS = [
  { id: "dynamic/default-model", name: "Dynamic Default Model" },
  { id: "dynamic/second-model", name: "Dynamic Second Model" },
] as const satisfies readonly GonkaGateModel[];

export const TEST_ENV = { GONKAGATE_API_KEY: "TESTKEY" };

export function createTestInstallDependencies(
  env: NodeJS.ProcessEnv = {},
): InstallDependencies {
  return {
    ...createNodeInstallDependencies(),
    env: { ...env, ...TEST_ENV },
    fetchModels: async () => TEST_MODELS,
  };
}
