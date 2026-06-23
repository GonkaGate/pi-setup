import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  BIN_NAME,
  BIN_PATH,
  GONKAGATE_API_KEY_BINDING,
  GONKAGATE_BASE_URL,
  GONKAGATE_PI_API,
  GONKAGATE_PROVIDER_ID,
  LEGACY_BIN_NAME,
  PACKAGE_NAME,
} from "../src/constants.js";
import { resolveDefaultPiModelsPath } from "../src/paths.js";
import { listRelativeFiles, readText, repoRoot } from "./contract-helpers.js";

interface PackageJson {
  readonly bin?: Record<string, string>;
  readonly engines?: Record<string, string>;
  readonly files?: string[];
  readonly name?: string;
  readonly scripts?: Record<string, string>;
  readonly type?: string;
}

test("package metadata matches the public scaffold contract", () => {
  const packageJson = JSON.parse(readText("package.json")) as PackageJson;

  assert.equal(packageJson.name, PACKAGE_NAME);
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.bin?.[BIN_NAME], BIN_PATH);
  assert.equal(packageJson.bin?.[LEGACY_BIN_NAME], BIN_PATH);
  assert.equal(packageJson.engines?.node, ">=22.14.0");
  assert.equal(packageJson.files?.includes("dist"), true);
  assert.equal(packageJson.files?.includes("bin"), true);
  assert.equal(packageJson.files?.includes("docs"), true);
  assert.equal(packageJson.files?.includes("README.md"), true);
  assert.equal(packageJson.files?.includes("CHANGELOG.md"), true);
  assert.equal(packageJson.files?.includes("LICENSE"), true);
  assert.match(packageJson.scripts?.build ?? "", /tsconfig\.build\.json/);
  assert.match(packageJson.scripts?.test ?? "", /npm run build/);
  assert.match(packageJson.scripts?.ci ?? "", /npm run typecheck/);
  assert.match(packageJson.scripts?.ci ?? "", /npm run test/);
  assert.match(packageJson.scripts?.ci ?? "", /npm run format:check/);
  assert.match(packageJson.scripts?.ci ?? "", /npm run package:check/);
});

test("bin wrapper stays a thin compiled ESM entrypoint", () => {
  const bin = readText(BIN_PATH);

  assert.match(bin, /^#!\/usr\/bin\/env node/);
  assert.match(bin, /from "\.\.\/dist\/cli\.js"/);
  assert.doesNotMatch(bin, /src\/cli/);
});

test("package does not expose a plain secret flag", () => {
  const source = readText("src/cli.ts");

  assert.doesNotMatch(source, /case "--api-key"/);
  assert.doesNotMatch(source, /--api-key <|--api-key=/);
  assert.match(source, /--api-key-stdin/);
  assert.match(source, /GONKAGATE_API_KEY/);
});

test("source constants match the fixed Pi public contract", () => {
  const home = join("tmp", "pi-user");

  assert.equal(PACKAGE_NAME, "@gonkagate/pi-setup");
  assert.equal(BIN_PATH, "bin/gonkagate-pi.js");
  assert.equal(GONKAGATE_PROVIDER_ID, "gonkagate");
  assert.equal(GONKAGATE_BASE_URL, "https://api.gonkagate.com/v1");
  assert.equal(GONKAGATE_PI_API, "openai-completions");
  assert.equal(GONKAGATE_API_KEY_BINDING, "$GONKAGATE_API_KEY");
  assert.equal(
    resolveDefaultPiModelsPath({ HOME: home }),
    join(home, ".pi", "agent", "models.json"),
  );
});

test("TypeScript relative imports use compiled ESM .js specifiers", () => {
  for (const relativePath of listRelativeFiles(resolve(repoRoot, "src"))) {
    if (!relativePath.endsWith(".ts")) {
      continue;
    }

    const source = readText(`src/${relativePath}`);
    const imports = source.matchAll(/from "(\.{1,2}\/[^"]+)"/g);

    for (const [, specifier] of imports) {
      assert.equal(
        specifier.endsWith(".js"),
        true,
        `${relativePath} imports ${specifier}`,
      );
    }
  }
});

test("CI workflow keeps Ubuntu and native Windows coverage", () => {
  const workflow = readText(".github/workflows/ci.yml");

  assert.match(workflow, /ubuntu-latest/);
  assert.match(workflow, /windows-latest/);
  assert.match(workflow, /npm run ci/);
});
