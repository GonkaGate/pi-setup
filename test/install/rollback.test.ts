import assert from "node:assert/strict";
import test from "node:test";
import { createNodeInstallDependencies } from "../../src/install/deps.js";
import { InstallError } from "../../src/install/errors.js";
import { installGonkagateProvider } from "../../src/install/index.js";
import {
  runRollbackActions,
  type RollbackAction,
} from "../../src/install/rollback.js";
import { createTestInstallDependencies } from "../model-fixtures.js";
import { createPiInstallHarness } from "./harness.js";

test("rollback restores backup contents", async () => {
  const copies: Array<readonly [string, string]> = [];
  const deps = createRollbackDeps({
    copyFile: async (source, destination) => {
      copies.push([source, destination]);
    },
  });

  await runRollbackActions(
    [
      {
        backupPath: "/tmp/models.backup",
        kind: "restore_backup",
        path: "/tmp/models.json",
      },
    ],
    deps,
  );

  assert.deepEqual(copies, [["/tmp/models.backup", "/tmp/models.json"]]);
});

test("rollback removes newly created files", async () => {
  const removed: string[] = [];
  const deps = createRollbackDeps({
    rm: async (path) => {
      removed.push(path);
    },
  });

  await runRollbackActions(
    [{ kind: "remove_created", path: "/tmp/models.json" }],
    deps,
  );

  assert.deepEqual(removed, ["/tmp/models.json"]);
});

test("rollback runs actions in reverse order", async () => {
  const order: string[] = [];
  const deps = createRollbackDeps({
    copyFile: async (_source, destination) => {
      order.push(destination);
    },
    rm: async (path) => {
      order.push(path);
    },
  });
  const actions: RollbackAction[] = [
    { kind: "remove_created", path: "/tmp/first.json" },
    {
      backupPath: "/tmp/second.backup",
      kind: "restore_backup",
      path: "/tmp/second.json",
    },
  ];

  await runRollbackActions(actions, deps);

  assert.deepEqual(order, ["/tmp/second.json", "/tmp/first.json"]);
});

test("rollback failures produce restore guidance", async () => {
  const deps = createRollbackDeps({
    copyFile: async () => {
      throw new Error("copy failed");
    },
  });

  await assert.rejects(
    runRollbackActions(
      [
        {
          backupPath: "/tmp/models.backup",
          kind: "restore_backup",
          path: "/tmp/models.json",
        },
      ],
      deps,
    ),
    (error: unknown) => {
      assert.equal(error instanceof InstallError, true);
      assert.equal((error as InstallError).errorCode, "rollback_failed");
      assert.match(
        (error as InstallError).message,
        /Restore manually from \/tmp\/models\.backup/,
      );
      return true;
    },
  );
});

test("install rollback restores original config after a late failure", async () => {
  const harness = await createPiInstallHarness();
  const original = `${JSON.stringify({
    providers: { existing: { apiKey: "$EXISTING" } },
  })}\n`;
  await harness.writeConfigText(original);
  const deps = {
    ...createTestInstallDependencies(harness.env),
    afterWrite: async () => {
      throw new Error("late failure");
    },
  };

  await assert.rejects(
    installGonkagateProvider(harness.configPath, false, deps),
    /late failure/,
  );

  assert.equal(await harness.readConfigText(), original);
});

function createRollbackDeps(
  fsOverrides: Partial<ReturnType<typeof createNodeInstallDependencies>["fs"]>,
) {
  const nodeDeps = createNodeInstallDependencies();

  return {
    ...nodeDeps,
    fs: {
      ...nodeDeps.fs,
      chmod: async () => undefined,
      ...fsOverrides,
    },
  };
}
