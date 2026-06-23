import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { tmpdir } from "node:os";

export interface PiInstallHarness {
  readonly configPath: string;
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
  readonly root: string;
  readonly assertNoTargetWrite: () => Promise<void>;
  readonly listBackups: () => Promise<string[]>;
  readonly readConfig: () => Promise<Record<string, unknown>>;
  readonly readConfigText: () => Promise<string>;
  readonly writeConfigText: (text: string) => Promise<void>;
}

export async function createPiInstallHarness(): Promise<PiInstallHarness> {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-harness-"));
  const home = join(root, "home");
  const configPath = join(home, ".pi", "agent", "models.json");
  await mkdir(home, { recursive: true });

  assert.equal(relative(root, configPath).startsWith(".."), false);

  return {
    configPath,
    env: { HOME: home },
    home,
    root,
    assertNoTargetWrite: async () => {
      await assert.rejects(access(dirname(configPath)), { code: "ENOENT" });
      await assert.rejects(access(configPath), { code: "ENOENT" });
    },
    listBackups: async () => {
      try {
        const names = await readdir(dirname(configPath));
        return names
          .filter((name) => name.startsWith("models.json.backup-"))
          .map((name) => join(dirname(configPath), name))
          .sort();
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return [];
        }

        throw error;
      }
    },
    readConfig: async () =>
      JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>,
    readConfigText: () => readFile(configPath, "utf8"),
    writeConfigText: async (text: string) => {
      await mkdir(dirname(configPath), { recursive: true });
      await writeFile(configPath, text);
    },
  };
}

export function createWindowsHarnessPaths(home = "C:\\Users\\Pi"): {
  readonly configPath: string;
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
} {
  return {
    configPath: `${home}\\.pi\\agent\\models.json`,
    env: { USERPROFILE: home },
    home,
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
