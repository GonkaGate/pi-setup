import process from "node:process";
import { InstallError } from "./errors.js";
import { nativePlatformPath, type PlatformPath } from "./platform-path.js";

export interface ResolvePathOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly pathApi?: PlatformPath;
}

export function resolveHomeDirectory(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.HOME !== undefined && env.HOME !== "") {
    return env.HOME;
  }

  if (env.USERPROFILE !== undefined && env.USERPROFILE !== "") {
    return env.USERPROFILE;
  }

  if (
    env.HOMEDRIVE !== undefined &&
    env.HOMEPATH !== undefined &&
    env.HOMEDRIVE !== "" &&
    env.HOMEPATH !== ""
  ) {
    return `${env.HOMEDRIVE}${env.HOMEPATH}`;
  }

  throw new InstallError(
    "missing_home",
    "Could not resolve the current user's home directory.",
  );
}

export function resolveDefaultPiModelsPath(
  options: ResolvePathOptions = {},
): string {
  const pathApi = options.pathApi ?? nativePlatformPath;
  return pathApi.join(
    resolveHomeDirectory(options.env),
    ".pi",
    "agent",
    "models.json",
  );
}

export function resolveInstallPath(
  inputPath: string | undefined,
  options: ResolvePathOptions = {},
): string {
  const pathApi = options.pathApi ?? nativePlatformPath;
  const env = options.env;

  if (inputPath === undefined || inputPath === "") {
    return resolveDefaultPiModelsPath(options);
  }

  if (inputPath === "~") {
    return resolveHomeDirectory(env);
  }

  if (inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
    return pathApi.join(resolveHomeDirectory(env), inputPath.slice(2));
  }

  if (pathApi.isAbsolute(inputPath)) {
    return inputPath;
  }

  return pathApi.resolve(options.cwd ?? process.cwd(), inputPath);
}
