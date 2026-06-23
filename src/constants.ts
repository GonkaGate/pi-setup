export const PACKAGE_NAME = "@gonkagate/pi-setup";
export const PACKAGE_VERSION = "0.1.0";
export const BIN_NAME = "pi-setup";
export const LEGACY_BIN_NAME = "gonkagate-pi";
export const BIN_PATH = "bin/gonkagate-pi.js";

export const GONKAGATE_PROVIDER_ID = "gonkagate";
export const GONKAGATE_PROVIDER_NAME = "GonkaGate";
export const GONKAGATE_BASE_URL = "https://api.gonkagate.com/v1";
export const GONKAGATE_PI_API = "openai-completions";
export const GONKAGATE_API_KEY_ENV = "GONKAGATE_API_KEY";
export const GONKAGATE_API_KEY_BINDING = "$GONKAGATE_API_KEY";
export const RECOMMENDED_MODEL_ID = "moonshotai/Kimi-K2.6";

export interface CuratedModel {
  readonly id: string;
  readonly name: string;
  readonly piFieldDecisions: PiModelFieldDecisions;
  readonly recommended: boolean;
}

export interface PiModelFieldDecisions {
  readonly compat: "use-pi-default-v1";
  readonly contextWindow: "use-pi-default-v1";
  readonly cost: "use-pi-default-v1";
  readonly input: "use-pi-default-v1";
  readonly maxTokens: "use-pi-default-v1";
  readonly reasoning: "use-pi-default-v1";
}

const USE_PI_DEFAULT_MODEL_FIELDS = {
  compat: "use-pi-default-v1",
  contextWindow: "use-pi-default-v1",
  cost: "use-pi-default-v1",
  input: "use-pi-default-v1",
  maxTokens: "use-pi-default-v1",
  reasoning: "use-pi-default-v1",
} as const satisfies PiModelFieldDecisions;

export const CURATED_MODELS = [
  {
    id: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    name: "Qwen3 235B A22B Instruct",
    piFieldDecisions: USE_PI_DEFAULT_MODEL_FIELDS,
    recommended: false,
  },
  {
    id: RECOMMENDED_MODEL_ID,
    name: "Kimi K2.6",
    piFieldDecisions: USE_PI_DEFAULT_MODEL_FIELDS,
    recommended: true,
  },
  {
    id: "minimaxai/minimax-m2.7",
    name: "MiniMax M2.7",
    piFieldDecisions: USE_PI_DEFAULT_MODEL_FIELDS,
    recommended: false,
  },
] as const satisfies readonly CuratedModel[];
