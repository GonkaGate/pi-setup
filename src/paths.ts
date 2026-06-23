import process from "node:process";
import {
  resolveDefaultPiModelsPath as resolveDefaultPiModelsPathWithOptions,
  resolveHomeDirectory as resolveHomeDirectoryWithEnv,
  resolveInstallPath as resolveInstallPathWithOptions,
} from "./install/paths.js";

export function resolveHomeDirectory(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return resolveHomeDirectoryWithEnv(env);
}

export function resolveDefaultPiModelsPath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return resolveDefaultPiModelsPathWithOptions({ env });
}

export function resolveInstallPath(
  inputPath: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return resolveInstallPathWithOptions(inputPath, {
    cwd: process.cwd(),
    env,
  });
}
