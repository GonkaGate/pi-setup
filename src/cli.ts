import { createRequire } from "node:module";
import process from "node:process";
import {
  createNodeInstallDependencies,
  type InstallDependencies,
} from "./install/deps.js";
import {
  BIN_NAME,
  GONKAGATE_API_KEY_ENV,
  PACKAGE_NAME,
  RECOMMENDED_MODEL_ID,
} from "./constants.js";
import { isEntrypointInvocation } from "./entrypoint.js";
import {
  toFailureResult,
  type InstallFailureResult,
} from "./install/errors.js";
import {
  installGonkagateProvider,
  type InstallResult,
} from "./install/index.js";
import { redactSecrets } from "./install/redact.js";
import { resolveInstallPath } from "./paths.js";

interface CliOptions {
  readonly apiKeyStdin: boolean;
  readonly configPath?: string;
  readonly dryRun: boolean;
  readonly help: boolean;
  readonly json: boolean;
  readonly modelId?: string;
  readonly version: boolean;
  readonly yes: boolean;
}

interface CliIo {
  readonly input: NodeJS.ReadableStream & { readonly isTTY?: boolean };
  readonly output: NodeJS.WritableStream & { readonly isTTY?: boolean };
  readonly error: NodeJS.WritableStream;
  readonly promptSecret?: InstallDependencies["promptSecret"];
  readonly promptSelectModel?: InstallDependencies["promptSelectModel"];
}

class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
  }
}

const defaultIo: CliIo = {
  input: process.stdin,
  output: process.stdout,
  error: process.stderr,
};

const packageVersion = (
  createRequire(import.meta.url)("../package.json") as {
    readonly version: string;
  }
).version;

export async function main(): Promise<void> {
  process.exitCode = await run(process.argv, process.env, defaultIo);
}

export async function run(
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
  io: CliIo = defaultIo,
): Promise<number> {
  let options: CliOptions;

  try {
    options = parseArgs(argv.slice(2));
  } catch (error) {
    io.error.write(renderCliError(error));
    return error instanceof CliError ? error.exitCode : 1;
  }

  if (options.help) {
    io.output.write(renderHelp());
    return 0;
  }

  if (options.version) {
    io.output.write(`${packageVersion}\n`);
    return 0;
  }

  try {
    const configPath = resolveInstallPath(options.configPath, env);
    const nodeDeps = createNodeInstallDependencies();

    const result = await installGonkagateProvider(
      configPath,
      {
        apiKeyStdin: options.apiKeyStdin,
        dryRun: options.dryRun,
        fullSetup: true,
        modelId: options.modelId,
        yes: options.yes || options.json,
      },
      {
        ...nodeDeps,
        env,
        error: io.error,
        input: io.input,
        output: io.output,
        promptSecret: io.promptSecret ?? nodeDeps.promptSecret,
        promptSelectModel: io.promptSelectModel ?? nodeDeps.promptSelectModel,
      },
    );

    if (options.json) {
      io.output.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    io.output.write(renderResult(result, options.dryRun));
    return 0;
  } catch (error) {
    const failure = toFailureResult(error);

    if (options.json) {
      io.output.write(`${JSON.stringify(failure, null, 2)}\n`);
    } else {
      io.error.write(renderFailure(failure));
    }

    return 1;
  }
}

export function renderCliEntrypointError(error: unknown): {
  readonly exitCode: number;
  readonly stderrText: string;
} {
  if (error instanceof CliError) {
    return {
      exitCode: error.exitCode,
      stderrText: renderCliError(error),
    };
  }

  return { exitCode: 1, stderrText: renderFailure(toFailureResult(error)) };
}

function parseArgs(args: readonly string[]): CliOptions {
  const secretFlag = `--api${"-key"}`;
  const options = {
    apiKeyStdin: false,
    dryRun: false,
    help: false,
    json: false,
    version: false,
    yes: false,
  };
  let configPath: string | undefined;
  let modelId: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === secretFlag || arg.startsWith(`${secretFlag}=`)) {
      throw new CliError("Secret-bearing API key flags are not supported.");
    }

    switch (arg) {
      case "--config":
        index += 1;
        configPath = readOptionValue(args, index, arg);
        break;
      case "--api-key-stdin":
        options.apiKeyStdin = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--model":
        index += 1;
        modelId = readOptionValue(args, index, arg);
        break;
      case "--version":
      case "-v":
        options.version = true;
        break;
      case "--yes":
      case "-y":
        options.yes = true;
        break;
      default:
        throw new CliError(`Unknown option: ${arg}`);
    }
  }

  return { ...options, configPath, modelId };
}

function readOptionValue(
  args: readonly string[],
  index: number,
  flag: string,
): string {
  const value = args[index];

  if (value === undefined || value.startsWith("-")) {
    throw new CliError(`${flag} requires a value.`);
  }

  return value;
}

function renderHelp(): string {
  return `${PACKAGE_NAME}

Usage:
  ${BIN_NAME} [--yes] [--model <id>] [--api-key-stdin] [--config <path>] [--dry-run] [--json]

Options:
  --yes, -y          Use the recommended model and non-interactive defaults
  --model <id>      Choose a curated GonkaGate model id
  --api-key-stdin   Read the GonkaGate API key from stdin
  --config <path>   Pi models.json path (default: ~/.pi/agent/models.json)
  --dry-run         Preview the managed config without writing
  --json            Print machine-readable result
  --version, -v     Print version
  --help, -h        Print help

Auth:
  Uses ${GONKAGATE_API_KEY_ENV}, --api-key-stdin, or a hidden prompt.
  Plain --api-key is intentionally unsupported.
`;
}

function renderResult(result: InstallResult, dryRun: boolean): string {
  const lines = [
    dryRun ? "Dry run complete." : "GonkaGate Pi provider configured.",
    `Config: ${result.configPath}`,
    ...(result.authPath === undefined ? [] : [`Auth: ${result.authPath}`]),
    ...(result.settingsPath === undefined
      ? []
      : [`Settings: ${result.settingsPath}`]),
    ...(result.selectedModelId === undefined
      ? []
      : [`Model: ${result.selectedModelId}`]),
    `Changed: ${String(result.changed)}`,
  ];

  if (result.backupPath !== undefined) {
    lines.push(`Config backup: ${result.backupPath}`);
  }

  if (result.authBackupPath !== undefined) {
    lines.push(`Auth backup: ${result.authBackupPath}`);
  }

  if (result.settingsBackupPath !== undefined) {
    lines.push(`Settings backup: ${result.settingsBackupPath}`);
  }

  lines.push(
    "",
    "Status: configured, not live verified.",
    `Next: pi --provider gonkagate --model ${result.selectedModelId ?? RECOMMENDED_MODEL_ID}`,
    "Then use plain pi after Pi reloads settings.json.",
    "If Pi is already running, open /model or restart Pi to reload models.json.",
  );

  return `${lines.join("\n")}\n`;
}

function renderFailure(result: InstallFailureResult): string {
  return `Error: ${result.message}\n`;
}

function renderCliError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown failure.";
  return `Error: ${redactSecrets(message)}\n`;
}

if (isEntrypointInvocation(import.meta.url)) {
  main().catch((error) => {
    const rendered = renderCliEntrypointError(error);
    process.stderr.write(rendered.stderrText);
    process.exitCode = rendered.exitCode;
  });
}
