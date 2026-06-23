import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { renderCliEntrypointError, run } from "../src/cli.js";
import { GONKAGATE_PROVIDER_ID, PACKAGE_VERSION } from "../src/constants.js";

test("CLI writes GonkaGate provider config", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--yes"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 0);
  assert.equal(error.join(""), "");
  assert.match(output.join(""), /GonkaGate Pi provider configured/);
  assert.equal(output.join("").includes(`Config: ${configPath}`), true);

  const config = JSON.parse(await readFile(configPath, "utf8")) as {
    providers: Record<string, unknown>;
  };
  assert.equal(typeof config.providers[GONKAGATE_PROVIDER_ID], "object");
});

test("CLI success output stays configured-not-verified", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--yes"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 0);
  assert.equal(error.join(""), "");
  assert.match(output.join(""), /configured, not live verified/);
  assert.match(output.join(""), /export GONKAGATE_API_KEY=gp-\.\.\./);
  assert.match(output.join(""), /pi --provider gonkagate --model/);
  assert.match(output.join(""), /open \/model or restart Pi/);
  assert.doesNotMatch(output.join(""), /gp-[A-Za-z0-9]{8,}/);
});

test("CLI preserves existing config and creates backup before replacement", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  await writeFile(
    configPath,
    `${JSON.stringify({ providers: { existing: { apiKey: "$EXISTING" } } })}\n`,
  );

  const output: string[] = [];
  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--yes"],
    {},
    createTestIo(output, []),
  );

  assert.equal(exitCode, 0);
  assert.match(output.join(""), /Backup:/);

  const config = JSON.parse(await readFile(configPath, "utf8")) as {
    providers: Record<string, unknown>;
  };
  assert.deepEqual(config.providers.existing, { apiKey: "$EXISTING" });
});

test("CLI emits structured JSON success", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--yes", "--json"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 0);
  assert.equal(error.join(""), "");

  const result = JSON.parse(output.join("")) as {
    changed: boolean;
    configPath: string;
    ok: boolean;
    providerId: string;
    status: string;
  };
  assert.equal(result.ok, true);
  assert.equal(result.status, "configured");
  assert.equal(result.configPath, configPath);
  assert.equal(result.providerId, GONKAGATE_PROVIDER_ID);
  assert.equal(result.changed, true);
});

test("CLI JSON success includes backup path when one is created", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  await writeFile(
    configPath,
    `${JSON.stringify({ providers: { existing: { apiKey: "$EXISTING" } } })}\n`,
  );
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--yes", "--json"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 0);
  assert.equal(error.join(""), "");

  const result = JSON.parse(output.join("")) as {
    backupPath: string;
    changed: boolean;
  };
  assert.equal(result.changed, true);
  assert.match(result.backupPath, /models\.json\.backup-/);
});

test("CLI dry-run resolves home config paths without creating parents", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const parentPath = join(root, "agent");
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", "~/agent/models.json", "--dry-run", "--json"],
    { HOME: root },
    createTestIo(output, error),
  );

  assert.equal(exitCode, 0);
  assert.equal(error.join(""), "");

  const result = JSON.parse(output.join("")) as {
    configPath: string;
  };
  assert.equal(result.configPath, join(root, "agent", "models.json"));
  await assert.rejects(access(parentPath), { code: "ENOENT" });
});

test("CLI dry-run reports changed without writing or creating backup", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  const original = `${JSON.stringify({ providers: { stale: {} } })}\n`;
  await writeFile(configPath, original);
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--dry-run", "--json"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 0);
  assert.equal(error.join(""), "");

  const result = JSON.parse(output.join("")) as {
    backupPath?: string;
    changed: boolean;
    status: string;
  };
  assert.equal(result.changed, true);
  assert.equal(result.status, "would_change");
  assert.equal(result.backupPath, undefined);
  assert.equal(await readFile(configPath, "utf8"), original);
  assert.deepEqual(
    (await readdir(root)).filter((name) => name.includes(".backup-")),
    [],
  );
});

test("CLI dry-run reports already configured without writing", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  const output: string[] = [];
  const error: string[] = [];

  assert.equal(
    await run(
      ["node", "cli", "--config", configPath, "--yes"],
      {},
      createTestIo([], []),
    ),
    0,
  );

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--dry-run", "--json"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 0);
  assert.equal(error.join(""), "");

  const result = JSON.parse(output.join("")) as {
    changed: boolean;
    status: string;
  };
  assert.equal(result.changed, false);
  assert.equal(result.status, "already_configured");
});

test("CLI JSON mode requires yes or dry-run instead of prompting", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--json"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 1);
  assert.equal(error.join(""), "");

  const result = JSON.parse(output.join("")) as {
    errorCode: string;
    ok: boolean;
    status: string;
  };
  assert.equal(result.ok, false);
  assert.equal(result.status, "failed");
  assert.equal(result.errorCode, "confirmation_required");
  await assert.rejects(access(configPath), { code: "ENOENT" });
});

test("CLI emits structured JSON failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  await writeFile(configPath, "[]\n");
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--yes", "--json"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 1);
  assert.equal(error.join(""), "");

  const result = JSON.parse(output.join("")) as {
    errorCode: string;
    ok: boolean;
    status: string;
  };
  assert.equal(result.ok, false);
  assert.equal(result.status, "failed");
  assert.equal(result.errorCode, "invalid_config");
});

test("CLI sends human failures to stderr", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  await writeFile(configPath, "[]\n");
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "--yes"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 1);
  assert.equal(output.join(""), "");
  assert.match(error.join(""), /Error:/);
  assert.match(error.join(""), /Could not parse/);
});

test("CLI reports missing home as a typed JSON failure", async () => {
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--yes", "--json"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 1);
  assert.equal(error.join(""), "");

  const result = JSON.parse(output.join("")) as {
    errorCode: string;
  };
  assert.equal(result.errorCode, "missing_home");
});

test("CLI redacts accidental gp keys on normal error paths", async () => {
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--token=gp-secret123"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 1);
  assert.equal(output.join(""), "");
  assert.doesNotMatch(error.join(""), /gp-secret123/);
  assert.match(error.join(""), /gp-\[REDACTED\]/);
});

test("entrypoint error renderer redacts accidental gp keys", () => {
  const rendered = renderCliEntrypointError(new Error("failed gp-secret123"));

  assert.equal(rendered.exitCode, 1);
  assert.doesNotMatch(rendered.stderrText, /gp-secret123/);
  assert.match(rendered.stderrText, /gp-\[REDACTED\]/);
});

test("CLI help documents the small setup surface", async () => {
  for (const flag of ["--help", "-h"]) {
    const output: string[] = [];
    const error: string[] = [];

    const exitCode = await run(
      ["node", "cli", flag],
      {},
      createTestIo(output, error),
    );

    assert.equal(exitCode, 0);
    assert.equal(error.join(""), "");
    assert.match(output.join(""), /~\/\.pi\/agent\/models\.json/);
    assert.match(output.join(""), /--dry-run/);
    assert.match(output.join(""), /--json/);
    assert.match(output.join(""), /GONKAGATE_API_KEY/);
    assert.match(output.join(""), /does not collect or store API keys/);
  }
});

test("CLI version flags match the package version", async () => {
  for (const flag of ["--version", "-v"]) {
    const output: string[] = [];
    const error: string[] = [];

    const exitCode = await run(
      ["node", "cli", flag],
      {},
      createTestIo(output, error),
    );

    assert.equal(exitCode, 0);
    assert.equal(error.join(""), "");
    assert.equal(output.join(""), `${PACKAGE_VERSION}\n`);
  }
});

test("CLI accepts -y as yes", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
  const configPath = join(root, "models.json");
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli", "--config", configPath, "-y"],
    {},
    createTestIo(output, error),
  );

  assert.equal(exitCode, 0);
  assert.equal(error.join(""), "");
  await access(configPath);
});

test("CLI rejects unknown flags and missing config values", async () => {
  for (const args of [
    ["node", "cli", "--unknown"],
    ["node", "cli", "--config"],
  ]) {
    const output: string[] = [];
    const error: string[] = [];

    const exitCode = await run(args, {}, createTestIo(output, error));

    assert.equal(exitCode, 1);
    assert.equal(output.join(""), "");
    assert.match(error.join(""), /Error:/);
  }
});

test("CLI rejects secret-bearing API key flags before install work", async () => {
  for (const secretArg of ["--api-key", "--api-key=gp-secret123"]) {
    const root = await mkdtemp(join(tmpdir(), "pi-setup-"));
    const configPath = join(root, "models.json");
    const output: string[] = [];
    const error: string[] = [];

    const exitCode = await run(
      ["node", "cli", "--config", configPath, secretArg],
      {},
      createTestIo(output, error),
    );

    assert.equal(exitCode, 1);
    assert.equal(output.join(""), "");
    assert.match(
      error.join(""),
      /Secret-bearing API key flags are not supported/,
    );
    assert.doesNotMatch(error.join(""), /gp-secret123/);
    await assert.rejects(access(configPath), { code: "ENOENT" });
  }
});

test("CLI requires explicit confirmation in non-interactive mode", async () => {
  const output: string[] = [];
  const error: string[] = [];

  const exitCode = await run(
    ["node", "cli"],
    { HOME: "/tmp/user" },
    createTestIo(output, error),
  );

  assert.equal(exitCode, 1);
  assert.equal(output.join(""), "");
  assert.match(error.join(""), /Pass --yes/);
});

function createTestIo(output: string[], error: string[]) {
  return {
    input: { isTTY: false },
    output: {
      isTTY: false,
      write(chunk: string) {
        output.push(chunk);
        return true;
      },
    },
    error: {
      write(chunk: string) {
        error.push(chunk);
        return true;
      },
    },
  } as never;
}
