import { CURATED_MODELS, GONKAGATE_PROVIDER_ID } from "../constants.js";
import { parseModelsConfig } from "../config.js";
import { createGonkagateProviderMergePlan } from "./config-mutations.js";
import {
  createNodeInstallDependencies,
  type InstallDependencies,
} from "./deps.js";
import { InstallError } from "./errors.js";
import { runRollbackActions, type RollbackAction } from "./rollback.js";
import { writeManagedConfig } from "./write.js";

export interface InstallResult {
  readonly backupPath?: string;
  readonly changed: boolean;
  readonly configPath: string;
  readonly modelIds: readonly string[];
  readonly ok: true;
  readonly providerId: string;
  readonly status: "already_configured" | "configured" | "would_change";
}

export async function installGonkagateProvider(
  configPath: string,
  dryRun: boolean,
  deps: InstallDependencies = createNodeInstallDependencies(),
): Promise<InstallResult> {
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
  const baseResult = {
    configPath,
    modelIds,
    ok: true,
    providerId: GONKAGATE_PROVIDER_ID,
  } as const;

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
