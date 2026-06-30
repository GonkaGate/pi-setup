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
import { clearLine, emitKeypressEvents, moveCursor } from "node:readline";
import { GONKAGATE_MODELS_URL, type GonkaGateModel } from "../constants.js";

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
  readonly fetchModels?: (apiKey: string) => Promise<readonly GonkaGateModel[]>;
  readonly fs: InstallFileSystem;
  readonly homeDirectory?: string;
  readonly input: NodeJS.ReadableStream & { readonly isTTY?: boolean };
  readonly output: NodeJS.WritableStream & { readonly isTTY?: boolean };
  readonly platform: NodeJS.Platform;
  readonly promptConfirm?: (question: string) => Promise<boolean>;
  readonly promptSecret?: (question: string) => Promise<string>;
  readonly promptSelectModel?: (
    models: readonly GonkaGateModel[],
    defaultModelId: string,
  ) => Promise<string>;
  readonly runCommand?: (
    command: string,
    args: readonly string[],
  ) => Promise<{ readonly exitCode: number }>;
}

interface TtyInputStream extends NodeJS.ReadableStream {
  readonly isTTY?: boolean;
  readonly setRawMode?: (enabled: boolean) => unknown;
}

export function createNodeInstallDependencies(): InstallDependencies {
  return {
    clock: { now: () => new Date() },
    cwd: process.cwd(),
    env: process.env,
    error: process.stderr,
    fetchModels: fetchGonkagateModels,
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
    promptSelectModel: (models, defaultModelId) =>
      promptModel(models, defaultModelId, process.stdin, process.stdout),
  };
}

async function fetchGonkagateModels(
  apiKey: string,
): Promise<readonly GonkaGateModel[]> {
  const response = await fetch(GONKAGATE_MODELS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`GonkaGate models request failed (${response.status}).`);
  }

  return parseModelsResponse(await response.json());
}

function parseModelsResponse(value: unknown): readonly GonkaGateModel[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("GonkaGate models response was not a model list.");
  }

  const models = value.data.flatMap((entry): GonkaGateModel[] => {
    if (!isRecord(entry) || typeof entry.id !== "string") {
      return [];
    }

    const id = entry.id.trim();
    if (id === "") {
      return [];
    }

    const name =
      typeof entry.name === "string" && entry.name.trim() !== ""
        ? entry.name.trim()
        : id;

    return [{ id, name }];
  });

  if (models.length === 0) {
    throw new Error("GonkaGate models response did not include any models.");
  }

  return models;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function promptModel(
  models: readonly GonkaGateModel[],
  defaultModelId: string,
  input: TtyInputStream,
  output: NodeJS.WritableStream & { readonly isTTY?: boolean },
): Promise<string> {
  if (models.length === 1) {
    return models[0].id;
  }

  if (
    !input.isTTY ||
    !output.isTTY ||
    input.setRawMode === undefined ||
    input.setRawMode === null
  ) {
    return defaultModelId;
  }
  const setRawMode = input.setRawMode.bind(input);

  const defaultIndex = Math.max(
    0,
    models.findIndex((model) => model.id === defaultModelId),
  );
  let selectedIndex = defaultIndex;
  let renderedLineCount = 0;

  const render = () => {
    if (renderedLineCount > 0) {
      clearRenderedLines(output, renderedLineCount);
    }

    const text = renderModelPicker(models, defaultModelId, selectedIndex);
    renderedLineCount = text.split("\n").length;
    output.write(text);
  };

  render();
  emitKeypressEvents(input);
  setRawMode(true);
  input.resume();

  return await new Promise<string>((resolve, reject) => {
    const cleanup = () => {
      input.off("keypress", onKeypress);
      setRawMode(false);
      output.write("\n");
    };

    const onKeypress = (_text: string, key: KeypressEvent) => {
      if (key.ctrl === true && key.name === "c") {
        cleanup();
        reject(new Error("Input cancelled."));
        return;
      }

      switch (key.name) {
        case "escape":
          cleanup();
          reject(new Error("Input cancelled."));
          return;
        case "return":
          cleanup();
          resolve(models[selectedIndex]?.id ?? defaultModelId);
          return;
        case "up":
          selectedIndex = (selectedIndex + models.length - 1) % models.length;
          render();
          return;
        case "down":
          selectedIndex = (selectedIndex + 1) % models.length;
          render();
          return;
      }
    };

    input.on("keypress", onKeypress);
  });
}

interface KeypressEvent {
  readonly ctrl?: boolean;
  readonly name?: string;
}

function renderModelPicker(
  models: readonly GonkaGateModel[],
  defaultModelId: string,
  selectedIndex: number,
): string {
  return [
    "Choose GonkaGate model for Pi:",
    ...models.flatMap((model, index) => {
      const marker = index === selectedIndex ? ">" : " ";
      const suffix = model.id === defaultModelId ? " (Default)" : "";
      return [
        `${marker} ${index + 1}. ${model.name}${suffix}`,
        `    ${model.id}`,
      ];
    }),
    "Use Up/Down arrows and Enter to select.",
  ].join("\n");
}

function clearRenderedLines(
  output: NodeJS.WritableStream,
  lineCount: number,
): void {
  moveCursor(output, 0, -(lineCount - 1));
  output.write("\r");

  for (let line = 0; line < lineCount; line += 1) {
    clearLine(output, 0);
    if (line < lineCount - 1) {
      moveCursor(output, 0, 1);
      output.write("\r");
    }
  }

  moveCursor(output, 0, -(lineCount - 1));
  output.write("\r");
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
