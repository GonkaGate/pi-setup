import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { GONKAGATE_PROVIDER_ID } from "../../src/constants.js";
import { installGonkagateProvider } from "../../src/install/index.js";
import { createPiInstallHarness } from "./harness.js";

test("managed write backs up existing config before atomic replacement", async () => {
  const harness = await createPiInstallHarness();
  const original = `${JSON.stringify({
    providers: { existing: { apiKey: "$EXISTING" } },
  })}\n`;
  await harness.writeConfigText(original);

  const result = await installGonkagateProvider(harness.configPath, false);

  assert.equal(result.changed, true);
  assert.equal(result.backupPath !== undefined, true);
  assert.deepEqual(await harness.listBackups(), [result.backupPath]);
  assert.equal(await readFile(result.backupPath as string, "utf8"), original);

  const config = await harness.readConfig();
  assert.deepEqual((config.providers as Record<string, unknown>).existing, {
    apiKey: "$EXISTING",
  });
  assert.equal(
    typeof (config.providers as Record<string, unknown>)[GONKAGATE_PROVIDER_ID],
    "object",
  );
});

test("managed write creates no backup for a new target file", async () => {
  const harness = await createPiInstallHarness();

  const result = await installGonkagateProvider(harness.configPath, false);

  assert.equal(result.changed, true);
  assert.equal(result.backupPath, undefined);
  assert.deepEqual(await harness.listBackups(), []);
});

test("managed write uses owner-only target mode where POSIX supports it", async (t) => {
  if (process.platform === "win32") {
    t.skip("Windows does not expose POSIX owner-only mode semantics.");
    return;
  }

  const harness = await createPiInstallHarness();

  await installGonkagateProvider(harness.configPath, false);

  assert.equal((await stat(harness.configPath)).mode & 0o777, 0o600);
});
