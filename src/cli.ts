import { createRequire } from "node:module";
import process from "node:process";
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
  readonly configPath?: string;
  readonly dryRun: boolean;
  readonly help: boolean;
  readonly json: boolean;
  readonly version: boolean;
}

interface CliIo {
  readonly output: NodeJS.WritableStream & { readonly isTTY?: boolean };
  readonly error: NodeJS.WritableStream;
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

    const result = await installGonkagateProvider(configPath, options.dryRun);

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
    dryRun: false,
    help: false,
    json: false,
    version: false,
  };
  let configPath: string | undefined;

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
      case "--version":
      case "-v":
        options.version = true;
        break;
      case "--yes":
      case "-y":
        break;
      default:
        throw new CliError(`Unknown option: ${arg}`);
    }
  }

  return { ...options, configPath };
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
  ${BIN_NAME} [--yes] [--config <path>] [--dry-run] [--json]

Options:
  --yes, -y          Accepted for compatibility
  --config <path>   Pi models.json path (default: ~/.pi/agent/models.json)
  --dry-run         Preview the managed config without writing
  --json            Print machine-readable result
  --version, -v     Print version
  --help, -h        Print help

Auth:
  export ${GONKAGATE_API_KEY_ENV}=gp-...
  This setup does not collect or store API keys.
`;
}

function renderResult(result: InstallResult, dryRun: boolean): string {
  const lines = [
    dryRun ? "Dry run complete." : "GonkaGate Pi provider configured.",
    `Config: ${result.configPath}`,
    `Changed: ${String(result.changed)}`,
  ];

  if (result.backupPath !== undefined) {
    lines.push(`Backup: ${result.backupPath}`);
  }

  lines.push(
    "",
    "Status: configured, not live verified.",
    `Next: export ${GONKAGATE_API_KEY_ENV}=gp-...`,
    `Then: pi --provider gonkagate --model ${RECOMMENDED_MODEL_ID}`,
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
