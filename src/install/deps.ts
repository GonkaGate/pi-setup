import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import process from "node:process";

export interface InstallFileSystem {
  readonly chmod?: (path: string, mode: number) => Promise<void>;
  readonly copyFile: (source: string, destination: string) => Promise<void>;
  readonly mkdir: (
    path: string,
    options: { readonly recursive: true },
  ) => Promise<void>;
  readonly readFile: (path: string, encoding: "utf8") => Promise<string>;
  readonly rename: (source: string, destination: string) => Promise<void>;
  readonly rm: (
    path: string,
    options: { readonly force: true },
  ) => Promise<void>;
  readonly writeFile: (
    path: string,
    text: string,
    options: { readonly mode: number },
  ) => Promise<void>;
}

export interface InstallDependencies {
  readonly afterWrite?: () => Promise<void>;
  readonly clock: { now(): Date };
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly error: NodeJS.WritableStream;
  readonly fs: InstallFileSystem;
  readonly homeDirectory?: string;
  readonly input: NodeJS.ReadableStream & { readonly isTTY?: boolean };
  readonly output: NodeJS.WritableStream & { readonly isTTY?: boolean };
  readonly platform: NodeJS.Platform;
  readonly promptConfirm?: (question: string) => Promise<boolean>;
  readonly runCommand?: (
    command: string,
    args: readonly string[],
  ) => Promise<{ readonly exitCode: number }>;
}

export function createNodeInstallDependencies(): InstallDependencies {
  return {
    clock: { now: () => new Date() },
    cwd: process.cwd(),
    env: process.env,
    error: process.stderr,
    fs: {
      chmod: (path, mode) => chmod(path, mode),
      copyFile: (source, destination) => copyFile(source, destination),
      mkdir: async (path, options) => {
        await mkdir(path, options);
      },
      readFile: (path, encoding) => readFile(path, encoding),
      rename: (source, destination) => rename(source, destination),
      rm: (path, options) => rm(path, options),
      writeFile: (path, text, options) => writeFile(path, text, options),
    },
    homeDirectory: process.env.HOME,
    input: process.stdin,
    output: process.stdout,
    platform: process.platform,
  };
}
