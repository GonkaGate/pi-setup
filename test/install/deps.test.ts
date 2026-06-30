import assert from "node:assert/strict";
import { PassThrough, Writable } from "node:stream";
import test from "node:test";
import { GONKAGATE_MODELS_URL } from "../../src/constants.js";
import {
  createNodeInstallDependencies,
  promptModel,
} from "../../src/install/deps.js";
import { TEST_MODELS } from "../model-fixtures.js";

test("node deps fetch GonkaGate models with bearer auth", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let authorization = "";

  globalThis.fetch = (async (url, init) => {
    requestedUrl = String(url);
    authorization = new Headers(init?.headers).get("Authorization") ?? "";

    return new Response(
      JSON.stringify({
        data: [
          { id: " dynamic/model ", name: " Dynamic Model " },
          { id: "dynamic/fallback-name" },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const models =
      await createNodeInstallDependencies().fetchModels?.("TESTKEY");

    assert.equal(requestedUrl, GONKAGATE_MODELS_URL);
    assert.equal(authorization, "Bearer TESTKEY");
    assert.deepEqual(models, [
      { id: "dynamic/model", name: "Dynamic Model" },
      { id: "dynamic/fallback-name", name: "dynamic/fallback-name" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("model prompt supports arrow-key selection", async () => {
  const rawModeChanges: boolean[] = [];
  const input = Object.assign(new PassThrough(), {
    isTTY: true,
    setRawMode(enabled: boolean) {
      rawModeChanges.push(enabled);
      return this;
    },
  }) as NodeJS.ReadWriteStream & {
    readonly isTTY?: boolean;
    readonly setRawMode?: (enabled: boolean) => unknown;
  };
  const outputChunks: string[] = [];
  const output = Object.assign(
    new Writable({
      write(chunk, _encoding, callback) {
        outputChunks.push(String(chunk));
        callback();
      },
    }),
    { isTTY: true },
  ) as NodeJS.WritableStream & { readonly isTTY?: boolean };

  const selected = promptModel(TEST_MODELS, TEST_MODELS[0].id, input, output);
  input.write("\u001B[B");
  input.write("\r");

  assert.equal(await selected, TEST_MODELS[1].id);
  assert.deepEqual(rawModeChanges, [true, false]);
  assert.match(outputChunks.join(""), /> 2\. Dynamic Second Model/);
});
