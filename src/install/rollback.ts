import type { InstallDependencies } from "./deps.js";
import { InstallError } from "./errors.js";

export type RollbackAction =
  | {
      readonly backupPath: string;
      readonly kind: "restore_backup";
      readonly path: string;
    }
  | {
      readonly kind: "remove_created";
      readonly path: string;
    };

export async function runRollbackActions(
  actions: readonly RollbackAction[],
  deps: InstallDependencies,
): Promise<void> {
  for (const action of [...actions].reverse()) {
    try {
      await runRollbackAction(action, deps);
    } catch (error) {
      throw new InstallError("rollback_failed", renderRollbackFailure(action), {
        cause: error,
      });
    }
  }
}

async function runRollbackAction(
  action: RollbackAction,
  deps: InstallDependencies,
): Promise<void> {
  if (action.kind === "restore_backup") {
    await deps.fs.copyFile(action.backupPath, action.path);
    await deps.fs.chmod?.(action.path, 0o600);
    return;
  }

  await deps.fs.rm(action.path, { force: true });
}

function renderRollbackFailure(action: RollbackAction): string {
  if (action.kind === "restore_backup") {
    return `Rollback failed for ${action.path}. Restore manually from ${action.backupPath}.`;
  }

  return `Rollback failed for ${action.path}. Remove the created file manually if needed.`;
}
