import { dirname, join } from "node:path";
import {
  CURATED_MODELS,
  GONKAGATE_API_KEY_ENV,
  GONKAGATE_PROVIDER_ID,
  RECOMMENDED_MODEL_ID,
} from "../constants.js";
import { parseModelsConfig } from "../config.js";
import { createGonkagateProviderMergePlan } from "./config-mutations.js";
import {
  createNodeInstallDependencies,
  type InstallDependencies,
} from "./deps.js";
import { InstallError } from "./errors.js";
import { runRollbackActions, type RollbackAction } from "./rollback.js";
import {
  createAuthMergePlan,
  createSettingsMergePlan,
  parseJsonObject,
} from "./user-config.js";
import { writeManagedConfig } from "./write.js";

export interface InstallResult {
  readonly authBackupPath?: string;
  readonly authChanged?: boolean;
  readonly authPath?: string;
  readonly backupPath?: string;
  readonly changed: boolean;
  readonly configPath: string;
  readonly modelIds: readonly string[];
  readonly ok: true;
  readonly providerId: string;
  readonly selectedModelId?: string;
  readonly settingsBackupPath?: string;
  readonly settingsChanged?: boolean;
  readonly settingsPath?: string;
  readonly status: "already_configured" | "configured" | "would_change";
}

export interface InstallOptions {
  readonly apiKeyStdin?: boolean;
  readonly dryRun: boolean;
  readonly fullSetup?: boolean;
  readonly modelId?: string;
  readonly yes?: boolean;
}

export async function installGonkagateProvider(
  configPath: string,
  optionsOrDryRun: InstallOptions | boolean,
  deps: InstallDependencies = createNodeInstallDependencies(),
): Promise<InstallResult> {
  const options =
    typeof optionsOrDryRun === "boolean"
      ? { dryRun: optionsOrDryRun, fullSetup: false, yes: true }
      : optionsOrDryRun;
  const existingText = await readOptionalText(configPath, deps);
  const existingConfig =
    existingText === undefined
      ? {}
      : parseExistingConfig(existingText, configPath);
  const mergePlan = createGonkagateProviderMergePlan(
    existingConfig,
    existingText,
  );
  const modelIds = CURATED_MODELS.map((model) => model.id);
  const selectedModelId = await resolveSelectedModelId(options, deps);
  const authPath = join(dirname(configPath), "auth.json");
  const settingsPath = join(dirname(configPath), "settings.json");
  const baseResult = {
    configPath,
    modelIds,
    ok: true,
    providerId: GONKAGATE_PROVIDER_ID,
    selectedModelId,
  } as const;

  if (options.fullSetup !== true) {
    return await finishConfigOnlyInstall(
      options.dryRun,
      configPath,
      existingText,
      mergePlan,
      baseResult,
      deps,
    );
  }

  const existingSettingsText = await readOptionalText(settingsPath, deps);
  const settingsConfig =
    existingSettingsText === undefined
      ? {}
      : parseExistingJsonObject(
          existingSettingsText,
          settingsPath,
          "Pi settings",
        );
  const settingsPlan = createSettingsMergePlan(
    settingsConfig,
    existingSettingsText,
    selectedModelId,
  );

  if (options.dryRun) {
    return {
      ...baseResult,
      authPath,
      changed: mergePlan.changed || settingsPlan.changed,
      settingsChanged: settingsPlan.changed,
      settingsPath,
      status:
        mergePlan.changed || settingsPlan.changed
          ? "would_change"
          : "already_configured",
    };
  }

  const apiKey = await resolveApiKey(options, deps);
  const existingAuthText = await readOptionalText(authPath, deps);
  const authConfig =
    existingAuthText === undefined
      ? {}
      : parseExistingJsonObject(existingAuthText, authPath, "Pi auth");
  const authPlan = createAuthMergePlan(authConfig, existingAuthText, apiKey);
  const changed = mergePlan.changed || authPlan.changed || settingsPlan.changed;

  if (!changed) {
    return {
      ...baseResult,
      authChanged: false,
      authPath,
      changed: false,
      settingsChanged: false,
      settingsPath,
      status: "already_configured",
    };
  }

  const rollbackActions: RollbackAction[] = [];
  let configBackupPath: string | undefined;
  let authBackupPath: string | undefined;
  let settingsBackupPath: string | undefined;

  try {
    if (mergePlan.changed) {
      const writeResult = await writeManagedConfig(
        configPath,
        mergePlan.text,
        existingText,
        deps,
      );
      configBackupPath = writeResult.backupPath;
      rollbackActions.push(writeResult.rollbackAction);
    }

    if (authPlan.changed) {
      const writeResult = await writeManagedConfig(
        authPath,
        authPlan.text,
        existingAuthText,
        deps,
      );
      authBackupPath = writeResult.backupPath;
      rollbackActions.push(writeResult.rollbackAction);
    }

    if (settingsPlan.changed) {
      const writeResult = await writeManagedConfig(
        settingsPath,
        settingsPlan.text,
        existingSettingsText,
        deps,
      );
      settingsBackupPath = writeResult.backupPath;
      rollbackActions.push(writeResult.rollbackAction);
    }

    await deps.afterWrite?.();

    return {
      ...baseResult,
      authBackupPath,
      authChanged: authPlan.changed,
      authPath,
      backupPath: configBackupPath,
      changed,
      settingsBackupPath,
      settingsChanged: settingsPlan.changed,
      settingsPath,
      status: "configured",
    };
  } catch (error) {
    if (rollbackActions.length > 0) {
      await runRollbackActions(rollbackActions, deps);
    }

    throw error;
  }
}

async function finishConfigOnlyInstall(
  dryRun: boolean,
  configPath: string,
  existingText: string | undefined,
  mergePlan: ReturnType<typeof createGonkagateProviderMergePlan>,
  baseResult: Pick<
    InstallResult,
    "configPath" | "modelIds" | "ok" | "providerId" | "selectedModelId"
  >,
  deps: InstallDependencies,
): Promise<InstallResult> {
  if (dryRun) {
    return {
      ...baseResult,
      changed: mergePlan.changed,
      status: mergePlan.changed ? "would_change" : "already_configured",
    };
  }

  if (!mergePlan.changed) {
    return { ...baseResult, changed: false, status: "already_configured" };
  }

  const rollbackActions: RollbackAction[] = [];

  try {
    const writeResult = await writeManagedConfig(
      configPath,
      mergePlan.text,
      existingText,
      deps,
    );
    rollbackActions.push(writeResult.rollbackAction);
    await deps.afterWrite?.();

    return {
      ...baseResult,
      backupPath: writeResult.backupPath,
      changed: true,
      status: "configured",
    };
  } catch (error) {
    if (rollbackActions.length > 0) {
      await runRollbackActions(rollbackActions, deps);
    }

    throw error;
  }
}

function parseExistingConfig(text: string, configPath: string) {
  try {
    return parseModelsConfig(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Invalid JSON.";
    throw new InstallError(
      "invalid_config",
      `Could not parse ${configPath}: ${reason}`,
      { cause: error },
    );
  }
}

function parseExistingJsonObject(text: string, path: string, label: string) {
  try {
    return parseJsonObject(text, label);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Invalid JSON.";
    throw new InstallError(
      "invalid_config",
      `Could not parse ${path}: ${reason}`,
      { cause: error },
    );
  }
}

async function resolveSelectedModelId(
  options: InstallOptions,
  deps: InstallDependencies,
): Promise<string> {
  if (options.modelId !== undefined) {
    const model = CURATED_MODELS.find((entry) => entry.id === options.modelId);

    if (model === undefined) {
      throw new InstallError(
        "unsupported_model",
        `Unsupported GonkaGate model: ${options.modelId}`,
      );
    }

    return model.id;
  }

  if (options.yes || deps.output.isTTY !== true || deps.input.isTTY !== true) {
    return RECOMMENDED_MODEL_ID;
  }

  const prompted = await deps.promptSelectModel?.(
    CURATED_MODELS,
    RECOMMENDED_MODEL_ID,
  );

  if (prompted === undefined || prompted === "") {
    return RECOMMENDED_MODEL_ID;
  }

  return await resolveSelectedModelId({ ...options, modelId: prompted }, deps);
}

async function resolveApiKey(
  options: InstallOptions,
  deps: InstallDependencies,
): Promise<string> {
  if (options.apiKeyStdin === true) {
    return requireSecret(await readAllInput(deps.input));
  }

  const envSecret = normalizeSecret(deps.env[GONKAGATE_API_KEY_ENV]);

  if (envSecret !== undefined) {
    return envSecret;
  }

  if (!options.yes && deps.input.isTTY === true && deps.output.isTTY === true) {
    const prompted = normalizeSecret(
      await deps.promptSecret?.("Enter your GonkaGate API key"),
    );

    if (prompted !== undefined) {
      return prompted;
    }
  }

  throw new InstallError(
    "secret_required",
    `GonkaGate API key required. Set ${GONKAGATE_API_KEY_ENV} or pass --api-key-stdin.`,
  );
}

async function readAllInput(input: NodeJS.ReadableStream): Promise<string> {
  let text = "";

  for await (const chunk of input) {
    text += typeof chunk === "string" ? chunk : String(chunk);
  }

  return text;
}

function requireSecret(value: string): string {
  const secret = normalizeSecret(value);

  if (secret === undefined) {
    throw new InstallError(
      "secret_required",
      "GonkaGate API key stdin input was empty.",
    );
  }

  return secret;
}

function normalizeSecret(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized === "" ? undefined : normalized;
}

async function readOptionalText(
  path: string,
  deps: InstallDependencies,
): Promise<string | undefined> {
  try {
    return await deps.fs.readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
