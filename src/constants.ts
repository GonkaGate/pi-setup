export const PACKAGE_NAME = "@gonkagate/pi-setup";
export const BIN_NAME = "pi-setup";
export const LEGACY_BIN_NAME = "gonkagate-pi";
export const BIN_PATH = "bin/gonkagate-pi.js";

export const GONKAGATE_PROVIDER_ID = "gonkagate";
export const GONKAGATE_PROVIDER_NAME = "GonkaGate";
export const GONKAGATE_BASE_URL = "https://api.gonkagate.com/v1";
export const GONKAGATE_MODELS_URL = `${GONKAGATE_BASE_URL}/models`;
export const GONKAGATE_PI_API = "openai-completions";
export const GONKAGATE_API_KEY_ENV = "GONKAGATE_API_KEY";
export const GONKAGATE_API_KEY_BINDING = "$GONKAGATE_API_KEY";

export interface GonkaGateModel {
  readonly id: string;
  readonly name: string;
}
