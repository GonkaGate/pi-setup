import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { GONKAGATE_PROVIDER_ID } from "../src/constants.js";
import { stringifyModelsConfig } from "../src/config.js";
import {
  createNodeInstallDependencies,
  type InstallDependencies,
  type InstallFileSystem,
} from "../src/install/deps.js";
import { InstallError, toFailureResult } from "../src/install/errors.js";
import { installGonkagateProvider } from "../src/install/index.js";
import { createGonkagateProviderConfig } from "../src/install/provider-config.js";

test("install runtime writes GonkaGate provider without CLI globals", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-install-"));
  const parentPath = join(root, "agent");
  const configPath = join(parentPath, "models.json");

  const result = await installGonkagateProvider(
    configPath,
    false,
    createNodeInstallDependencies(),
  );

  assert.equal(result.changed, true);
  assert.equal(result.configPath, configPath);
  assert.equal(result.backupPath, undefined);
  assert.equal(result.ok, true);
  assert.equal(result.providerId, GONKAGATE_PROVIDER_ID);
  assert.equal(result.status, "configured");
  await access(parentPath);

  const config = JSON.parse(await readFile(configPath, "utf8")) as {
    providers: Record<string, unknown>;
  };
  assert.equal(typeof config.providers[GONKAGATE_PROVIDER_ID], "object");
});

test("install runtime dry-run does not create config files", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-install-"));
  const parentPath = join(root, "agent");
  const configPath = join(parentPath, "models.json");

  const result = await installGonkagateProvider(
    configPath,
    true,
    createNodeInstallDependencies(),
  );

  assert.equal(result.changed, true);
  await assert.rejects(access(parentPath), { code: "ENOENT" });
  await assert.rejects(access(configPath), { code: "ENOENT" });
});

test("install runtime stubs no-write dependencies for dry-run", async () => {
  let madeDirectory = false;
  let wroteFile = false;
  const deps = createStubInstallDependencies({
    fs: {
      readFile: async () => '{"providers":{"existing":{}}}\n',
      mkdir: async () => {
        madeDirectory = true;
        return undefined;
      },
      writeFile: async () => {
        wroteFile = true;
      },
    },
  });

  const result = await installGonkagateProvider("/tmp/models.json", true, deps);

  assert.equal(result.changed, true);
  assert.equal(madeDirectory, false);
  assert.equal(wroteFile, false);
  assert.equal(deps.input.isTTY, true);
  assert.equal(deps.output.isTTY, false);
  assert.equal(deps.env.HOME, "/tmp/home");
  assert.equal(deps.homeDirectory, "/tmp/home");
  assert.equal(deps.platform, "win32");
  assert.equal(await deps.promptConfirm?.("Write?"), true);
});

test("install runtime uses stubbed clock for backup names", async () => {
  const copiedTo: string[] = [];
  let writtenText = "";
  const deps = createStubInstallDependencies({
    clock: { now: () => new Date("2026-01-02T03:04:05.000Z") },
    fs: {
      readFile: async () => '{"providers":{"stale":{}}}\n',
      copyFile: async (_source, destination) => {
        copiedTo.push(String(destination));
      },
      writeFile: async (_path, text) => {
        writtenText = String(text);
      },
    },
  });

  const result = await installGonkagateProvider(
    "/tmp/models.json",
    false,
    deps,
  );

  assert.equal(result.backupPath, "/tmp/models.json.backup-20260102T030405Z");
  assert.deepEqual(copiedTo, [result.backupPath]);
  assert.match(writtenText, /"gonkagate"/);
});

test("install runtime skips backup and writes for unchanged content", async () => {
  const currentText = stringifyModelsConfig({
    providers: {
      [GONKAGATE_PROVIDER_ID]: createGonkagateProviderConfig(),
    },
  });
  let copied = false;
  let wrote = false;
  let renamed = false;
  const deps = createStubInstallDependencies({
    fs: {
      copyFile: async () => {
        copied = true;
      },
      readFile: async () => currentText,
      rename: async () => {
        renamed = true;
      },
      writeFile: async () => {
        wrote = true;
      },
    },
  });

  const result = await installGonkagateProvider(
    "/tmp/models.json",
    false,
    deps,
  );

  assert.equal(result.changed, false);
  assert.equal(copied, false);
  assert.equal(wrote, false);
  assert.equal(renamed, false);
});

test("install runtime writes a temp file then renames it into place", async () => {
  const chmodCalls: Array<readonly [string, number]> = [];
  const renames: Array<readonly [string, string]> = [];
  let writePath = "";
  let writeMode = 0;
  const deps = createStubInstallDependencies({
    clock: { now: () => new Date("2026-01-02T03:04:05.000Z") },
    fs: {
      chmod: async (path, mode) => {
        chmodCalls.push([path, mode]);
      },
      rename: async (source, destination) => {
        renames.push([source, destination]);
      },
      writeFile: async (path, _text, options) => {
        writePath = path;
        writeMode = options.mode;
      },
    },
  });

  const result = await installGonkagateProvider(
    "/tmp/models.json",
    false,
    deps,
  );

  assert.equal(result.backupPath, undefined);
  assert.equal(writePath, "/tmp/models.json.tmp-20260102T030405Z");
  assert.equal(writeMode, 0o600);
  assert.deepEqual(chmodCalls, [[writePath, 0o600]]);
  assert.deepEqual(renames, [[writePath, "/tmp/models.json"]]);
});

test("install runtime throws typed parse errors", async () => {
  const deps = createStubInstallDependencies({
    fs: {
      readFile: async () => "[]\n",
    },
  });

  await assert.rejects(
    installGonkagateProvider("/tmp/models.json", false, deps),
    isInstallError("invalid_config"),
  );
});

test("install runtime throws typed backup errors", async () => {
  const deps = createStubInstallDependencies({
    fs: {
      readFile: async () => '{"providers":{"stale":{}}}\n',
      copyFile: async () => {
        throw new Error("copy denied");
      },
    },
  });

  await assert.rejects(
    installGonkagateProvider("/tmp/models.json", false, deps),
    isInstallError("backup_failed"),
  );
});

test("install runtime exposes write failures through stubbed filesystem", async () => {
  const deps = createStubInstallDependencies({
    fs: {
      writeFile: async () => {
        throw new Error("write denied");
      },
    },
  });

  await assert.rejects(
    installGonkagateProvider("/tmp/models.json", false, deps),
    isInstallError("write_failed"),
  );
});

test("install runtime write failures include backup path when present", async () => {
  const backupPath = "/tmp/models.json.backup-20260102T030405Z";
  const deps = createStubInstallDependencies({
    clock: { now: () => new Date("2026-01-02T03:04:05.000Z") },
    fs: {
      readFile: async () => '{"providers":{"stale":{}}}\n',
      writeFile: async () => {
        throw new Error("write denied");
      },
    },
  });

  await assert.rejects(
    installGonkagateProvider("/tmp/models.json", false, deps),
    (error: unknown) => {
      assert.equal(error instanceof InstallError, true);
      assert.equal((error as InstallError).errorCode, "write_failed");
      assert.match((error as InstallError).message, /\/tmp\/models\.json/);
      assert.match((error as InstallError).message, new RegExp(backupPath));
      return true;
    },
  );
});

test("failure results classify and redact unexpected errors", () => {
  const result = toFailureResult(new Error("boom gp-secret123"));

  assert.equal(result.ok, false);
  assert.equal(result.status, "failed");
  assert.equal(result.errorCode, "unexpected_error");
  assert.doesNotMatch(result.message, /gp-secret123/);
  assert.match(result.message, /gp-\[REDACTED\]/);
});

function createStubInstallDependencies(
  overrides: Omit<Partial<InstallDependencies>, "fs"> & {
    readonly fs?: Partial<InstallFileSystem>;
  } = {},
): InstallDependencies {
  const { fs: fsOverrides, ...dependencyOverrides } = overrides;
  const missing = Object.assign(new Error("missing"), { code: "ENOENT" });
  const fs = {
    chmod: async () => undefined,
    copyFile: async () => undefined,
    mkdir: async () => undefined,
    readFile: async () => {
      throw missing;
    },
    rename: async () => undefined,
    rm: async () => undefined,
    writeFile: async () => undefined,
    ...fsOverrides,
  } as InstallFileSystem;

  return {
    clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
    cwd: "/work",
    env: { HOME: "/tmp/home" },
    error: { write: () => true } as unknown as NodeJS.WritableStream,
    homeDirectory: "/tmp/home",
    input: { isTTY: true } as NodeJS.ReadableStream & {
      readonly isTTY?: boolean;
    },
    output: {
      isTTY: false,
      write: () => true,
    } as unknown as NodeJS.WritableStream & {
      readonly isTTY?: boolean;
    },
    platform: "win32",
    promptConfirm: async () => true,
    runCommand: async () => ({ exitCode: 0 }),
    ...dependencyOverrides,
    fs,
  };
}

function isInstallError(errorCode: InstallError["errorCode"]) {
  return (error: unknown): boolean => {
    assert.equal(error instanceof InstallError, true);
    assert.equal((error as InstallError).errorCode, errorCode);
    return true;
  };
}
