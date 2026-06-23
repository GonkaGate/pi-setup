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
import readline from "node:readline/promises";
import type { CURATED_MODELS } from "../constants.js";

type CuratedModel = (typeof CURATED_MODELS)[number];

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
  readonly promptSecret?: (question: string) => Promise<string>;
  readonly promptSelectModel?: (
    models: readonly CuratedModel[],
    recommendedModelId: string,
  ) => Promise<string>;
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
    promptSecret: (question) =>
      promptHidden(question, process.stdin, process.stdout),
    promptSelectModel: (models, recommendedModelId) =>
      promptModel(models, recommendedModelId, process.stdin, process.stdout),
  };
}

async function promptModel(
  models: readonly CuratedModel[],
  recommendedModelId: string,
  input: NodeJS.ReadableStream & { readonly isTTY?: boolean },
  output: NodeJS.WritableStream & { readonly isTTY?: boolean },
): Promise<string> {
  if (!input.isTTY || !output.isTTY) {
    return recommendedModelId;
  }

  const recommendedIndex = Math.max(
    0,
    models.findIndex((model) => model.id === recommendedModelId),
  );
  output.write("Choose the GonkaGate model for Pi:\n");
  models.forEach((model, index) => {
    const suffix = model.id === recommendedModelId ? " (Recommended)" : "";
    output.write(`  ${index + 1}. ${model.name}${suffix}\n     ${model.id}\n`);
  });

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`Model [${recommendedIndex + 1}]: `);
    const selectedIndex =
      answer.trim() === "" ? recommendedIndex : Number(answer.trim()) - 1;
    return models[selectedIndex]?.id ?? recommendedModelId;
  } finally {
    rl.close();
  }
}

async function promptHidden(
  question: string,
  input: NodeJS.ReadStream,
  output: NodeJS.WritableStream & { readonly isTTY?: boolean },
): Promise<string> {
  if (!input.isTTY || !output.isTTY || input.setRawMode === undefined) {
    return "";
  }

  output.write(`${question}: `);
  input.setRawMode(true);
  input.resume();

  return await new Promise<string>((resolve, reject) => {
    let value = "";

    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      output.write("\n");
    };

    const onData = (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === 3) {
          cleanup();
          reject(new Error("Input cancelled."));
          return;
        }

        if (byte === 13 || byte === 10) {
          cleanup();
          resolve(value);
          return;
        }

        if (byte === 127 || byte === 8) {
          value = value.slice(0, -1);
          continue;
        }

        value += String.fromCharCode(byte);
      }
    };

    input.on("data", onData);
  });
}
