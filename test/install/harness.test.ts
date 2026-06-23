import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import test from "node:test";
import {
  posixPlatformPath,
  win32PlatformPath,
} from "../../src/install/platform-path.js";
import { resolveDefaultPiModelsPath } from "../../src/install/paths.js";
import {
  createPiInstallHarness,
  createWindowsHarnessPaths,
} from "./harness.js";

test("Pi install harness creates isolated temp homes", async () => {
  const harness = await createPiInstallHarness();

  assert.equal(
    resolveDefaultPiModelsPath({ env: harness.env }),
    harness.configPath,
  );
  await harness.assertNoTargetWrite();

  await harness.writeConfigText('{"providers":{"existing":{}}}\n');
  assert.deepEqual(await harness.readConfig(), {
    providers: { existing: {} },
  });
  assert.equal(
    await harness.readConfigText(),
    '{"providers":{"existing":{}}}\n',
  );
});

test("Pi install harness models POSIX paths", () => {
  assert.equal(
    resolveDefaultPiModelsPath({
      env: { HOME: "/home/pi" },
      pathApi: posixPlatformPath,
    }),
    "/home/pi/.pi/agent/models.json",
  );
});

test("Pi install harness lists backups without touching real Pi config", async () => {
  const harness = await createPiInstallHarness();

  assert.deepEqual(await harness.listBackups(), []);
  await harness.writeConfigText("{}\n");
  await writeFile(`${harness.configPath}.backup-20260101T000000Z`, "old\n");

  assert.deepEqual(await harness.listBackups(), [
    `${harness.configPath}.backup-20260101T000000Z`,
  ]);
});

test("Pi install harness models simulated Windows paths", () => {
  const harness = createWindowsHarnessPaths();

  assert.equal(
    resolveDefaultPiModelsPath({
      env: harness.env,
      pathApi: win32PlatformPath,
    }),
    harness.configPath,
  );
});
