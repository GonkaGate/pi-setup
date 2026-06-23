import { GONKAGATE_PROVIDER_ID } from "../constants.js";

export const PI_MODELS_JSON_OWNERSHIP = {
  ownedPath: ["providers", GONKAGATE_PROVIDER_ID],
  preserve: "everything_else",
  target: "models_json",
} as const;
