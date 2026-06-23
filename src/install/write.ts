import { dirname } from "node:path";
import type { InstallDependencies } from "./deps.js";
import { InstallError } from "./errors.js";
import type { RollbackAction } from "./rollback.js";

export interface ManagedWriteResult {
  readonly backupPath?: string;
  readonly rollbackAction: RollbackAction;
}

export async function writeManagedConfig(
  configPath: string,
  text: string,
  existingText: string | undefined,
  deps: InstallDependencies,
): Promise<ManagedWriteResult> {
  await createParentDirectory(configPath, deps);

  const timestamp = formatBackupTimestamp(deps.clock.now());
  const backupPath =
    existingText === undefined
      ? undefined
      : `${configPath}.backup-${timestamp}`;
  const tempPath = `${configPath}.tmp-${timestamp}`;

  if (backupPath !== undefined) {
    await copyBackup(configPath, backupPath, deps);
  }

  await writeTempAndRename(configPath, tempPath, text, backupPath, deps);

  return {
    backupPath,
    rollbackAction:
      backupPath === undefined
        ? { kind: "remove_created", path: configPath }
        : { backupPath, kind: "restore_backup", path: configPath },
  };
}

async function createParentDirectory(
  configPath: string,
  deps: InstallDependencies,
): Promise<void> {
  try {
    await deps.fs.mkdir(dirname(configPath), { recursive: true });
  } catch (error) {
    throw new InstallError(
      "write_failed",
      `Could not create parent directory for ${configPath}.`,
      { cause: error },
    );
  }
}

async function copyBackup(
  configPath: string,
  backupPath: string,
  deps: InstallDependencies,
): Promise<void> {
  try {
    await deps.fs.copyFile(configPath, backupPath);
    await deps.fs.chmod?.(backupPath, 0o600);
  } catch (error) {
    throw new InstallError(
      "backup_failed",
      `Could not create backup ${backupPath} for ${configPath}.`,
      { cause: error },
    );
  }
}

async function writeTempAndRename(
  configPath: string,
  tempPath: string,
  text: string,
  backupPath: string | undefined,
  deps: InstallDependencies,
): Promise<void> {
  try {
    await deps.fs.writeFile(tempPath, text, { mode: 0o600 });
    await deps.fs.chmod?.(tempPath, 0o600);
    await deps.fs.rename(tempPath, configPath);
  } catch (error) {
    const suffix =
      backupPath === undefined
        ? ""
        : ` Backup already exists at ${backupPath}.`;
    throw new InstallError(
      "write_failed",
      `Could not write ${configPath}.${suffix}`,
      { cause: error },
    );
  }
}

function formatBackupTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
