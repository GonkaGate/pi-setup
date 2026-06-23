import assert from "node:assert/strict";
import test from "node:test";
import { assertMatchesAll, readText } from "./contract-helpers.js";

test("PRD documents the Pi setup product contract", () => {
  const prd = readText("docs/specs/pi-setup-prd/spec.md");

  assertMatchesAll(prd, [
    /@gonkagate\/pi-setup/,
    /~\/\.pi\/agent\/models\.json/,
    /providers\.gonkagate/,
    /https:\/\/api\.gonkagate\.com\/v1/,
    /openai-completions/,
    /GONKAGATE_API_KEY/,
    /Model Catalog Requirements/,
    /Success Semantics/,
    /Write Safety And Recovery/,
    /Never perform telemetry/,
    /macOS, Linux, native Windows, and WSL/,
    /--dry-run/,
    /--json/,
    /Do not accept secrets through plain CLI flags such as `--api-key`/,
    /npm run ci/,
  ]);
});

test("AGENTS points to the PRD source of truth", () => {
  const agents = readText("AGENTS.md");

  assert.match(agents, /docs\/specs\/pi-setup-prd\/spec\.md/);
});

test("README keeps the SEO header aligned with sibling setup repos", () => {
  const readme = readText("README.md");

  assertMatchesAll(readme, [
    /^# @gonkagate\/pi-setup/m,
    /Configure Pi Coding Agent to use GonkaGate as an OpenAI-compatible custom\s+provider with one `npx` command\./,
    /npx -y @gonkagate\/pi-setup@latest/,
    /img\.shields\.io\/badge\/package-%40gonkagate%2Fpi--setup/,
    /img\.shields\.io\/badge\/node-%3E%3D22\.14\.0/,
    /img\.shields\.io\/badge\/Pi%20Coding%20Agent-custom%20provider/,
    /\[!\[Website\].*https:\/\/gonkagate\.com\/en/,
    /\[!\[Docs\].*https:\/\/gonkagate\.com\/en\/docs/,
    /\[!\[API%20Key\].*https:\/\/gonkagate\.com\/en\/register/,
    /Pi Coding Agent/,
    /GonkaGate API/,
    /~\/\.pi\/agent\/models\.json/,
  ]);
});

test("PRD records the contract source map and setup success semantics", () => {
  const prd = readText("docs/specs/pi-setup-prd/spec.md");

  assertMatchesAll(prd, [
    /Contract Source Map/,
    /`package\.json`: npm package name, public bins/,
    /`src\/constants\.ts`: provider id, provider name/,
    /`src\/paths\.ts`: default Pi `models\.json` target/,
    /`AGENTS\.md`: repository-facing product invariants/,
    /`docs\/specs\/pi-setup-prd\/spec\.md`: product requirements/,
    /Current setup success means `configured`/,
    /It does not mean `verified`/,
    /live\s+Pi\/GonkaGate verification is deferred future work/,
  ]);
});

test("public docs keep the fixed config-only Pi contract", () => {
  for (const path of [
    "README.md",
    "AGENTS.md",
    "docs/specs/pi-setup-prd/spec.md",
  ]) {
    const text = readText(path);

    assertMatchesAll(text, [
      /~\/\.pi\/agent\/models\.json/,
      /providers\.gonkagate/,
      /GONKAGATE_API_KEY/,
      /auth\.json/,
      /shell profiles|shell profile mutation/,
      /\.env/,
      /arbitrary custom base URLs/,
      /arbitrary.*model ids/,
      /backup/i,
      /config-only/,
      /concurrent-writer safety/,
      /configured/,
      /verified/,
    ]);
    assertNoDefaultLiveVerificationClaim(text);
  }
});

test("PRD defines explicit evidence gates for deferred v1 work", () => {
  const prd = readText("docs/specs/pi-setup-prd/spec.md");

  assertMatchesAll(prd, [
    /Deferred Work Gates/,
    /Pi auth mutation or `auth\.json` writes: needs verified Pi credential format/,
    /Shell profile mutation: needs supported-shell scope/,
    /`\.env` generation: needs target-file ownership/,
    /Arbitrary custom base URLs or arbitrary custom model ids: need validation/,
    /Concurrent-writer safety claims: need locking or an equivalent design/,
    /docs must not claim\s+simultaneous setup processes are safe/,
    /Live Pi\/GonkaGate verification: needs an explicit opt-in design/,
    /separates\s+local Pi provider visibility from live GonkaGate API calls/,
    /The default v1 setup remains config-only, network-free/,
  ]);
});

test("PRD documents curated model metadata decisions", () => {
  const prd = readText("docs/specs/pi-setup-prd/spec.md");

  assertMatchesAll(prd, [
    /Current v1 metadata decision/,
    /`use-pi-default-v1` for `reasoning`, `input`, `contextWindow`, `maxTokens`,/,
    /`cost`, and `compat` in `src\/constants\.ts`/,
    /generated provider config keeps\s+only the currently supported `id` and `name` fields/,
  ]);
});

test("docs cover backup restore and avoid concurrent-writer overclaim", () => {
  const readme = readText("README.md");
  const prd = readText("docs/specs/pi-setup-prd/spec.md");

  for (const text of [readme, prd]) {
    assertMatchesAll(text, [
      /Restore from a backup by copying the generated `models\.json\.backup-\*` file/,
      /~\/\.pi\/agent\/models\.json/,
    ]);
    assert.doesNotMatch(text, /is concurrent-writer safe/i);
    assert.doesNotMatch(text, /provides concurrent-writer safety/i);
    assert.doesNotMatch(text, /safe for simultaneous setup/i);
  }
});

test("docs distinguish CI-backed platform proof from manual WSL smoke", () => {
  const readme = readText("README.md");
  const prd = readText("docs/specs/pi-setup-prd/spec.md");

  assertMatchesAll(readme, [
    /CI is configured for Ubuntu and native Windows/,
    /WSL remains a manual smoke\s+target/,
  ]);
  assertMatchesAll(prd, [
    /CI-backed proof: GitHub Actions is configured to run `npm run ci`/,
    /`ubuntu-latest` and `windows-latest`/,
    /unit tests cover POSIX, native Windows,\s+HOMEDRIVE\/HOMEPATH fallback, and Git-Bash-style `~` inputs/,
    /Manual WSL smoke checklist/,
    /Until that checklist is run, docs must not describe WSL behavior as\s+CI-backed proof/,
  ]);
});

function assertNoDefaultLiveVerificationClaim(text: string): void {
  assert.doesNotMatch(
    text,
    /setup (verifies|validates|checks) (live )?(GonkaGate|Pi)/i,
  );
  assert.doesNotMatch(text, /default setup .*verified/i);
}
