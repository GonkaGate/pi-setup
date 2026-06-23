# Implementation Plan: GonkaGate Pi Setup Runtime

## Overview

This plan originally took `@gonkagate/pi-setup` from the scaffold to a
production-quality config-only installer. The active product contract changed
to v2 on 2026-06-23: setup now owns a small Pi-native auth/default-model flow in
addition to the provider catalog.

The v2 runtime configures Pi by managing:

- `~/.pi/agent/models.json -> providers.gonkagate`
- `~/.pi/agent/auth.json -> gonkagate`
- `~/.pi/agent/settings.json -> defaultProvider/defaultModel`

It must not print keys, accept plain `--api-key`, mutate shell profiles,
generate `.env`, expose arbitrary base URLs, expose arbitrary model ids, or
claim live GonkaGate/Pi verification.

## V2 Addendum: Pi Auth And Default Model Setup

### V2 Task 01: Approve and document the v2 scope

Status: [x] Done

**Description:** Replace the v1 config-only contract with a small v2 contract
that uses Pi-native `models.json`, `auth.json`, and `settings.json` while
preserving the existing prohibited surfaces.

**Acceptance criteria:**

- [x] Docs describe API-key input through `GONKAGATE_API_KEY`,
      `--api-key-stdin`, or a hidden prompt.
- [x] Docs describe writing Pi `auth.json` and `settings.json`.
- [x] Docs still prohibit plain `--api-key`, shell profile mutation, `.env`
      generation, arbitrary custom base URLs, arbitrary custom model ids, and
      default live verification.

**Verification:**

- [x] `rtk npm run test`

**Evidence:** `rtk npm run test` passed with docs and skill contract coverage
after the v2 docs update.

### V2 Task 02: Implement safe secret intake and Pi-native writes

Status: [x] Done

**Description:** Add the smallest v2 runtime flow: curated model selection,
safe key intake, managed `auth.json` write, and managed `settings.json` write.

**Acceptance criteria:**

- [x] `--api-key` and `--api-key=<value>` stay rejected before writes.
- [x] `GONKAGATE_API_KEY` can configure Pi without printing the key.
- [x] `--api-key-stdin` can configure Pi without printing the key.
- [x] Non-interactive setup without a key source fails before writing.
- [x] Non-curated model ids fail before writing.
- [x] Existing managed files are backed up before replacement.

**Verification:**

- [x] `rtk npm run test`

**Evidence:** CLI tests cover env key setup, stdin key setup, no-key failure,
invalid model rejection, JSON output, backups, and redaction.

### V2 Task 03: Final readiness gate

Status: [x] Done

**Acceptance criteria:**

- [x] `rtk npm run ci`
- [x] packaged-bin smoke for help, version, and temp-config JSON setup
- [x] no docs/contract drift after formatting

**Verification:**

- [x] `rtk npm run ci`
- [x] `rtk node -e "<packaged-bin smoke>"`

**Evidence:** `rtk npm run ci` passed typecheck, build, 95 tests, Prettier
check, and publint. Packaged-bin smoke verified `--help`, `--version`, JSON
setup against a temp config path, creation of `models.json`, `auth.json`, and
`settings.json`, and no secret leakage in stdout.

## Historical V1 Baseline

The sections below are retained as the original v1 implementation history.
They are superseded for active work by the v2 addendum above wherever they
mention config-only setup, no secret intake, no `auth.json` writes, or no
settings writes.

## Architecture / Quality Bar

Use these patterns from `opencode-setup`, trimmed to Pi's smaller scope:

- thin public `src/cli.ts` entrypoint with parsing, execution, and rendering
  separated from install logic
- `src/install/` runtime with explicit dependency injection for filesystem,
  clock, input/prompts, runtime env, and command seams when needed
- pure helpers for provider config generation, path resolution, config parsing,
  merge planning, stringification, and result rendering
- typed result and error contracts with stable `ok`, `status`, `errorCode`,
  `message`, `configPath`, `changed`, `backupPath`, `providerId`, and `modelIds`
  fields
- no-op detection before any backup or write
- backup-before-replace, atomic managed writes, and rollback actions for late
  failures
- clean JSON mode: no prompts or human-only text on stdout when `--json` is
  requested
- isolated temp-home and temp-config test harnesses that never touch real Pi
  config
- docs and contract tests that keep README, AGENTS, PRD, package metadata, CLI
  help, and mirrored skills aligned with shipped behavior

Do not copy OpenCode-only scope: no secret intake/storage, no `auth.json`, no
effective OpenCode/Pi session verification as a default v1 step, no provider
scope picker, no arbitrary model picker, and no new dependency unless the
stdlib path is not enough.

## Repository Truth To Preserve

- npm package: `@gonkagate/pi-setup`
- public entrypoint: `npx @gonkagate/pi-setup`
- runtime entrypoint: `src/cli.ts`
- public bins: `pi-setup` and `gonkagate-pi`
- package bin target: `bin/gonkagate-pi.js`
- `bin/gonkagate-pi.js` remains a thin wrapper over compiled `dist/cli.js`
- target config: `~/.pi/agent/models.json`
- managed provider key: `providers.gonkagate`
- provider id: `gonkagate`
- provider name: `GonkaGate`
- base URL: `https://api.gonkagate.com/v1`
- Pi API type: `openai-completions`
- auth binding: `apiKey: "$GONKAGATE_API_KEY"`
- recommended model: `moonshotai/Kimi-K2.6`
- current curated model ids:
  `qwen/qwen3-235b-a22b-instruct-2507-fp8`,
  `moonshotai/Kimi-K2.6`, and `minimaxai/minimax-m2.7`
- preserve unrelated providers and top-level Pi config values
- create a backup before replacing an existing `models.json`
- do not collect, accept, print, or store GonkaGate API keys
- do not add `--api-key`
- do not mutate `~/.pi/agent/auth.json`
- do not mutate shell profiles
- do not generate `.env`
- arbitrary custom base URLs and arbitrary custom model ids are out of scope for
  v1
- live GonkaGate/Pi session verification is out of scope unless it is designed
  as explicit gated/deferred work
- TypeScript source imports must keep runtime-correct `.js` specifiers
- repository validation script remains `npm run ci`; local shell invocation uses
  `rtk npm run ci`

## Codex Goal Execution Contract

Use this plan with Codex Goals when the implementation work should continue
across turns until a verifiable stopping condition is reached.

Recommended full-run goal:

```text
/goal Implement tasks.md for @gonkagate/pi-setup through the final readiness gate, verified by the checked task acceptance criteria, passing `rtk npm run ci`, packaged-bin smoke checks, and docs/contract alignment, while preserving every Repository Truth invariant and keeping v1 config-only with no secret collection, no auth.json writes, no shell profile mutation, no .env generation, and no default live GonkaGate/Pi verification. Work checkpoint-by-checkpoint in task order, update task status only after evidence is collected, and stop with blockers if a product decision, missing external proof, or unavailable validation command prevents a defensible completion.
```

Safer checkpoint-sized goal:

```text
/goal Complete the next unchecked checkpoint in tasks.md, verified by that checkpoint's task acceptance criteria and verification commands, while preserving all Repository Truth invariants. Update tasks.md with evidence only for completed tasks. If blocked, stop with the exact task, attempted commands, blocker, and input needed.
```

Goal boundaries:

- Work only in `/Users/daniil/Projects/Opensource/pi-setup` unless a task
  explicitly needs read-only comparison against `opencode-setup`.
- Use `rtk` for every shell command.
- Keep implementation changes aligned with the task's "Files likely touched";
  touching other files requires a concrete dependency explanation.
- Do not broaden v1 scope to secret intake/storage, live verification, Pi auth
  mutation, shell profile mutation, `.env` generation, arbitrary base URLs, or
  arbitrary model ids.
- Do not mark a task complete because it looks done. Mark it complete only after
  the task's verification evidence exists.
- If a goal budget is reached, summarize completed evidence and remaining tasks;
  do not treat the budget limit as completion.

Iteration policy:

- Start each continuation by reading the next unchecked task and its dependencies.
- Prefer one task at a time; batch only when tasks have the same files and the
  same verification surface.
- After each task, run the narrowest useful check first, then the checkpoint's
  required check.
- At each checkpoint, run `rtk npm run ci` unless the checkpoint explicitly says
  a narrower check is enough.
- Keep diffs scoped and boring; delete or simplify before adding abstraction.

Progress log format for goal runs:

```text
Task:
Status:
Files changed:
Verification:
Evidence:
Remaining:
```

Blocked stop conditions:

- A required product decision is missing or conflicts with Repository Truth.
- A task would require collecting, accepting, printing, or storing a GonkaGate
  API key.
- A task would require mutating `~/.pi/agent/auth.json`, shell profiles, or
  `.env` files.
- A task would require claiming live GonkaGate/Pi verification without an
  explicit approved design.
- Required validation cannot run after reasonable local troubleshooting.

## Phase 1: Contract and source-of-truth hardening

### Task 01: Lock the public contract in one source map

Status: [x] Done

**Description:** Create a small source-of-truth map for package, bin, provider,
model catalog, config path, auth binding, and prohibited surfaces so later code,
docs, and tests do not drift.

**Acceptance criteria:**

- [x] The contract map points to the current owner for each invariant:
      `package.json`, `src/constants.ts`, `src/paths.ts`, `AGENTS.md`, and the
      PRD.
- [x] The map explicitly distinguishes current behavior from future/deferred
      behavior.
- [x] The map records that setup success means `configured`, not live
      `verified`.
- [x] No behavior or source code is changed as part of this task except tests or
      docs needed to pin the contract.

**Verification:**

- [x] Contract tests fail if package name, bin path, provider id, base URL, Pi
      API type, auth binding, or config target drift.
- [x] `rtk npm run ci`

**Dependencies:** None

**Files likely touched:**

- `test/package-contract.test.ts`
- `test/docs-contract.test.ts`
- `src/constants.ts`
- `docs/specs/pi-setup-prd/spec.md`

**Estimated scope:** Small

### Task 02: Harden docs and skill truth guards

Status: [x] Done

**Description:** Expand existing docs and mirrored-skill contract tests so
public docs cannot claim secret handling, live Pi verification, `auth.json`
writes, shell profile mutation, `.env` generation, custom base URLs, or custom
model ids before implementation and product approval.

**Acceptance criteria:**

- [x] README, AGENTS, PRD, and mirrored skills are tested for the fixed Pi
      contract.
- [x] Tests assert docs mention backup restore and configured-vs-verified
      semantics before release.
- [x] Tests assert docs do not claim default live GonkaGate/Pi session
      verification.
- [x] `.agents/skills/` and `.claude/skills/` remain mirrored.

**Verification:**

- [x] `rtk npm run test`
- [x] `rtk npm run ci` after docs changes

**Dependencies:** Task 01

**Files likely touched:**

- `test/docs-contract.test.ts`
- `test/skills-contract.test.ts`
- `README.md`
- `AGENTS.md`
- `.agents/skills/pi-setup-development/SKILL.md`
- `.claude/skills/pi-setup-development/SKILL.md`

**Estimated scope:** Small

### Task 03: Define v1 deferred-work gates

Status: [x] Done

**Description:** Add explicit gates for features that must remain out of v1
until separately designed: Pi auth mutation, shell profile mutation, `.env`
generation, arbitrary model/base URL input, concurrent-writer safety claims, and
live Pi/GonkaGate verification.

**Acceptance criteria:**

- [x] Each deferred feature has a short "what evidence is needed before
      implementation" note.
- [x] Live verification is documented only as future gated work and not part of
      default setup.
- [x] Concurrent-writer safety is not claimed unless locking or an equivalent
      design is implemented.
- [x] Product docs stay clear that v1 is config-only.

**Verification:**

- [x] Docs contract test covers the deferred gates.
- [x] `rtk npm run ci`

**Dependencies:** Task 02

**Files likely touched:**

- `docs/specs/pi-setup-prd/spec.md`
- `README.md`
- `AGENTS.md`
- `test/docs-contract.test.ts`

**Estimated scope:** Small

## Checkpoint after Tasks 01-03

- [x] `rtk npm run ci` passes.
- [x] Public contract and out-of-scope surfaces are pinned by tests.
- [x] No docs claim live Pi/GonkaGate verification.

## Phase 2: Runtime foundation and dependency injection

### Task 04: Split CLI from install runtime

Status: [x] Done

**Description:** Move install logic out of `src/cli.ts` into a small
`src/install/` runtime and keep `src/cli.ts` as the public entrypoint that wires
parse, execute, and render.

**Acceptance criteria:**

- [x] `src/cli.ts` exports the public `run()` and entrypoint error renderer.
- [x] CLI parsing/rendering is separate from config read/write logic.
- [x] Install runtime can be invoked directly from tests without real process
      globals.
- [x] Existing public bin behavior is preserved.

**Verification:**

- [x] CLI unit tests cover `run()` against injected dependencies.
- [x] Bin smoke still runs `rtk node bin/gonkagate-pi.js --help`.
- [x] `rtk npm run test`

**Dependencies:** Tasks 01-03

**Files likely touched:**

- `src/cli.ts`
- `src/cli/parse.ts`
- `src/cli/execute.ts`
- `src/cli/render.ts`
- `src/cli/contracts.ts`
- `src/install/index.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium

### Task 05: Add minimal install dependency seams

Status: [x] Done

**Description:** Introduce a compact `InstallDependencies` object for filesystem,
clock, input/prompts, runtime env, stdout/stderr writers, and optional command
runner seams. Keep the shape smaller than `opencode-setup` because Pi v1 does
not run Pi commands by default.

**Acceptance criteria:**

- [x] Install runtime receives dependencies instead of importing process/fs
      directly in core logic.
- [x] Node-backed dependencies exist for production.
- [x] Tests can stub reads, writes, prompts, TTY flags, env, home directory,
      platform, and clock.
- [x] No new dependency is added unless stdlib cannot cover the seam.

**Verification:**

- [x] Unit tests use stubbed dependencies for no-write and failure cases.
- [x] Temp filesystem integration tests use node-backed dependencies.
- [x] `rtk npm run test`

**Dependencies:** Task 04

**Files likely touched:**

- `src/install/deps.ts`
- `src/install/index.ts`
- `test/install/test-deps.ts`
- `test/install/harness.ts`

**Estimated scope:** Medium

### Task 06: Add typed results, errors, and redaction

Status: [x] Done

**Description:** Replace generic thrown errors with typed install errors and
structured results that render consistently in human and JSON modes. Add a small
redaction boundary for any accidental `gp-...` text on user-facing error paths.

**Acceptance criteria:**

- [x] Success result includes `ok`, `status`, `configPath`, `changed`,
      `backupPath`, `providerId`, and `modelIds`.
- [x] Failure result includes `ok: false`, `status: "failed"`, `errorCode`, and
      `message`.
- [x] JSON mode emits valid JSON for success and failure.
- [x] Human mode sends errors to stderr and normal results to stdout.
- [x] Fallback entrypoint errors redact `gp-...` strings.

**Verification:**

- [x] Tests cover typed parse, backup, write, missing home, and unexpected
      errors.
- [x] Tests prove redaction in normal and fallback error renderers.
- [x] `rtk npm run test`

**Dependencies:** Tasks 04-05

**Files likely touched:**

- `src/install/errors.ts`
- `src/install/contracts.ts`
- `src/install/redact.ts`
- `src/cli/render.ts`
- `test/cli.test.ts`
- `test/install/errors.test.ts`

**Estimated scope:** Medium

## Checkpoint after Tasks 04-06

- [x] `rtk npm run ci` passes.
- [x] CLI is thin and install logic is dependency-injected.
- [x] JSON and human rendering have one shared result contract.

## Phase 3: Pi path and config target resolution

### Task 07: Centralize platform path handling

Status: [x] Done

**Description:** Add a small path API seam for POSIX, native Windows, and
Git-Bash-style Windows paths. Keep the implementation focused on Pi's one
managed target.

**Acceptance criteria:**

- [x] Path resolution can use POSIX or Windows path APIs in tests.
- [x] `HOME`, `USERPROFILE`, and `HOMEDRIVE` plus `HOMEPATH` are supported.
- [x] `~` and `~/...` / `~\\...` expand against the resolved home.
- [x] Missing home fails with a typed, actionable error.
- [x] Runtime paths remain inside the selected user home unless `--config`
      explicitly overrides the target.

**Verification:**

- [x] Unit tests cover POSIX home, native Windows home, drive/homepath fallback,
      Git Bash-style input, missing home, and relative config paths.
- [x] `rtk npm run test`

**Dependencies:** Tasks 04-06

**Files likely touched:**

- `src/install/platform-path.ts`
- `src/install/paths.ts`
- `src/paths.ts`
- `test/install/paths.test.ts`
- `test/paths.test.ts`

**Estimated scope:** Medium

### Task 08: Resolve the Pi models target and parent directories

Status: [x] Done

**Description:** Make `~/.pi/agent/models.json` the default resolved target and
keep `--config <path>` as a test/development override. Create missing parent
directories only during real writes, never during dry-run.

**Acceptance criteria:**

- [x] Default target resolves to `<home>/.pi/agent/models.json`.
- [x] `--config <path>` resolves deterministically against cwd or home.
- [x] Dry-run resolves the target but creates no directories or files.
- [x] Write mode creates missing parents just before write.
- [x] Resolved paths are included in human and JSON output.

**Verification:**

- [x] Temp filesystem tests cover missing parent directories.
- [x] Dry-run tests assert no parent directory is created.
- [x] `rtk npm run test`

**Dependencies:** Task 07

**Files likely touched:**

- `src/install/paths.ts`
- `src/install/index.ts`
- `test/install/paths.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Small

### Task 09: Build the isolated Pi install harness

Status: [x] Done

**Description:** Add a minimal test harness that creates temp home directories,
temp config targets, fake TTY flags, deterministic clocks, and easy assertions
that no real `~/.pi` path was touched.

**Acceptance criteria:**

- [x] Tests can create temp homes and config files without touching the real
      developer machine.
- [x] Harness exposes helpers for reading target config, checking backups, and
      asserting no writes.
- [x] Harness works on Ubuntu and native Windows CI.
- [x] Harness stays small and uses `node:test` plus stdlib.

**Verification:**

- [x] Harness self-tests cover POSIX and simulated Windows path behavior.
- [x] `rtk npm run test`

**Dependencies:** Tasks 05, 07-08

**Files likely touched:**

- `test/install/harness.ts`
- `test/install/test-deps.ts`
- `test/install/paths.test.ts`

**Estimated scope:** Small

## Checkpoint after Tasks 07-09

- [x] `rtk npm run ci` passes.
- [x] Path tests prove POSIX, native Windows, and WSL-relevant behavior.
- [x] No test writes to the real Pi config path.

## Phase 4: Provider catalog and constants hardening

### Task 10: Harden the curated model registry

Status: [x] Done

**Description:** Extend the curated model contract so every public Pi model has
an explicit decision for Pi fields listed in the PRD: `reasoning`, `input`,
`contextWindow`, `maxTokens`, `cost`, and `compat`.

**Acceptance criteria:**

- [x] Each curated model has stable `id`, display `name`, and explicit
      recommended ownership.
- [x] Exactly one model is recommended unless product requirements change.
- [x] Every PRD-listed Pi field has an explicit source decision, even if the
      value is "use Pi default for v1".
- [x] Registry still includes all public curated GonkaGate models.
- [x] No arbitrary model ids are accepted.

**Verification:**

- [x] Unit tests prove every curated model appears in generated provider config.
- [x] Tests fail if there is zero or more than one recommended model.
- [x] Docs contract covers model metadata decision policy.
- [x] `rtk npm run test`

**Dependencies:** Tasks 01-03

**Files likely touched:**

- `src/constants.ts`
- `src/install/provider-config.ts`
- `test/config.test.ts`
- `test/package-contract.test.ts`
- `docs/specs/pi-setup-prd/spec.md`

**Estimated scope:** Medium

### Task 11: Generate provider config from the registry

Status: [x] Done

**Description:** Move provider config generation behind a pure helper that
derives the Pi provider block from constants and registry entries.

**Acceptance criteria:**

- [x] Generated provider has `name`, `baseUrl`, `api`, `apiKey`, and `models`.
- [x] `apiKey` is exactly `$GONKAGATE_API_KEY`.
- [x] Model order is deterministic.
- [x] Provider id remains `gonkagate`.
- [x] Helper has no filesystem or process dependency.

**Verification:**

- [x] Unit tests compare the generated provider shape to the PRD contract.
- [x] Unit tests prove no raw `gp-` value can enter generated config.
- [x] `rtk npm run test`

**Dependencies:** Task 10

**Files likely touched:**

- `src/install/provider-config.ts`
- `src/config.ts`
- `src/constants.ts`
- `test/install/provider-config.test.ts`
- `test/config.test.ts`

**Estimated scope:** Small

### Task 12: Pin package/bin/version contract

Status: [x] Done

**Description:** Keep npm package metadata, bins, Node engine, ESM build, and
compiled runtime contract aligned with source constants and tests.

**Acceptance criteria:**

- [x] Package name remains `@gonkagate/pi-setup`.
- [x] Public bins remain `pi-setup` and `gonkagate-pi`.
- [x] Both bins point to `bin/gonkagate-pi.js`.
- [x] Runtime remains compiled ESM from `dist/`.
- [x] TypeScript source keeps `.js` relative import specifiers.

**Verification:**

- [x] Package contract tests cover bin, files, scripts, engine, type, and
      version source.
- [x] `rtk npm run package:check`
- [x] `rtk npm run ci`

**Dependencies:** Tasks 04, 10-11

**Files likely touched:**

- `package.json`
- `bin/gonkagate-pi.js`
- `src/constants.ts`
- `test/package-contract.test.ts`

**Estimated scope:** Small

## Checkpoint after Tasks 10-12

- [x] `rtk npm run ci` passes.
- [x] Generated provider config is pure and fully tested.
- [x] Package/bin contract matches the public npm entrypoint.

## Phase 5: Config parse/merge/write/backup implementation

### Task 13: Implement config document parsing

Status: [x] Done

**Description:** Parse existing `models.json` safely. Keep plain JSON for v1
unless Pi docs or real fixtures prove JSONC support is required.

**Acceptance criteria:**

- [x] Missing config is treated as an empty object.
- [x] Invalid JSON fails without backup or write.
- [x] Non-object JSON fails without backup or write.
- [x] Scalar `providers` is handled by replacing only the managed provider
      parent as explicitly designed and tested.
- [x] Errors include the target path and concise reason.

**Verification:**

- [x] Unit tests cover missing, valid object, invalid JSON, array root, scalar
      root, and scalar `providers`.
- [x] Filesystem tests prove invalid input leaves the original file unchanged.
- [x] `rtk npm run test`

**Dependencies:** Tasks 05-09

**Files likely touched:**

- `src/install/config-document.ts`
- `src/config.ts`
- `src/install/errors.ts`
- `test/install/config-document.test.ts`
- `test/config.test.ts`

**Estimated scope:** Medium

### Task 14: Merge only `providers.gonkagate`

Status: [x] Done

**Description:** Build a pure merge plan that preserves unrelated top-level
config and unrelated providers while replacing only the managed
`providers.gonkagate` subtree.

**Acceptance criteria:**

- [x] Existing unrelated top-level keys are preserved exactly as JSON values.
- [x] Existing unrelated providers are preserved.
- [x] Existing `providers.gonkagate` is replaced with the generated provider.
- [x] Output is deterministic, two-space JSON, with newline at EOF.
- [x] The helper reports whether content would change before filesystem work.

**Verification:**

- [x] Unit tests cover new config, existing unrelated provider, existing stale
      GonkaGate provider, unrelated top-level values, and idempotent no-op.
- [x] Snapshot-like expected JSON tests cover stable formatting.
- [x] `rtk npm run test`

**Dependencies:** Tasks 11, 13

**Files likely touched:**

- `src/install/config-mutations.ts`
- `src/config.ts`
- `test/install/config-mutations.test.ts`
- `test/config.test.ts`

**Estimated scope:** Medium

### Task 15: Implement backup-first atomic managed writes

Status: [x] Done

**Description:** Replace direct `writeFile` with managed write logic:
no-op detection, parent creation, timestamped backup for existing changed files,
atomic replacement, and deterministic backup names.

**Acceptance criteria:**

- [x] No backup or write happens when content is unchanged.
- [x] No backup is created for a new target file.
- [x] Existing changed config is backed up before replacement.
- [x] Atomic replacement uses stdlib temp-file plus rename unless a dependency
      is justified.
- [x] Backup and target files use conservative permissions where supported.
- [x] Write failures include target path and backup path when a backup was
      already created.

**Verification:**

- [x] Stubbed tests cover no-op, new file, backup failure, write failure, and
      deterministic timestamp.
- [x] Filesystem integration tests verify backup contents and final contents.
- [x] `rtk npm run test`

**Dependencies:** Tasks 05, 08, 13-14

**Files likely touched:**

- `src/install/write.ts`
- `src/install/managed-files.ts`
- `src/install/errors.ts`
- `test/install/write.test.ts`

**Estimated scope:** Medium

## Checkpoint after Tasks 13-15

- [x] `rtk npm run ci` passes.
- [x] Parse failures leave the target untouched.
- [x] Changed existing configs get a backup before replacement.
- [x] Idempotent reruns do not rewrite or create backups.

## Phase 6: Ownership, preservation, and rollback behavior

### Task 16: Encode Pi ownership as data

Status: [x] Done

**Description:** Represent Pi ownership as a small managed-target plan:
target `models_json`, owned path `providers.gonkagate`, preserve everything
else.

**Acceptance criteria:**

- [x] Ownership model is explicit in code, not scattered in ad hoc object
      spreads.
- [x] Tests prove only `providers.gonkagate` is owned.
- [x] Tests prove top-level Pi values are not removed or normalized.
- [x] Tests prove unrelated provider values are not modified.

**Verification:**

- [x] Unit tests cover ownership preservation and replacement.
- [x] Fixture diff review shows only managed provider changes.
- [x] `rtk npm run test`

**Dependencies:** Tasks 13-15

**Files likely touched:**

- `src/install/contracts.ts`
- `src/install/config-mutations.ts`
- `test/install/ownership.test.ts`

**Estimated scope:** Small

### Task 17: Add rollback actions for late failures

Status: [x] Done

**Description:** Track rollback actions for changed managed files so if a later
runtime step fails after a write, the previous file is restored or a newly
created file is removed.

**Acceptance criteria:**

- [x] Write result includes `rollbackAction` for changed files.
- [x] Existing-file rollback restores backup contents.
- [x] New-file rollback removes the created file.
- [x] Rollback runs in reverse write order.
- [x] Rollback failures produce a typed error and clear restore guidance.

**Verification:**

- [x] Unit tests cover restore backup, delete created file, reverse order, and
      rollback failure.
- [x] Integration test forces a late failure after writing and proves original
      config is restored.
- [x] `rtk npm run test`

**Dependencies:** Task 15

**Files likely touched:**

- `src/install/rollback.ts`
- `src/install/managed-write-transaction.ts`
- `src/install/index.ts`
- `test/install/rollback.test.ts`
- `test/install/rerun.test.ts`

**Estimated scope:** Medium

### Task 18: Define diagnostics for preservation and recovery

Status: [x] Done

**Description:** Make preservation and recovery behavior visible to users and
automation without overclaiming crash-safety or concurrent-writer safety.

**Acceptance criteria:**

- [x] Human output includes backup path when a backup exists.
- [x] JSON output includes backup path when a backup exists.
- [x] Write failure diagnostics include target path and backup path when
      available.
- [x] Docs explain how to restore from a backup.
- [x] Docs do not claim concurrent-writer safety unless locking is implemented.

**Verification:**

- [x] CLI tests cover backup path in human and JSON output.
- [x] Docs contract tests cover backup restore wording and no overclaim.
- [x] `rtk npm run ci`

**Dependencies:** Tasks 15-17

**Files likely touched:**

- `src/cli/render.ts`
- `src/install/errors.ts`
- `README.md`
- `docs/specs/pi-setup-prd/spec.md`
- `test/cli.test.ts`
- `test/docs-contract.test.ts`

**Estimated scope:** Small

## Checkpoint after Tasks 16-18

- [x] `rtk npm run ci` passes.
- [x] Ownership is explicit and tested.
- [x] Rollback behavior is tested before any broader CLI claims.

## Phase 7: CLI UX, dry-run, JSON output, and rerun behavior

### Task 19: Harden CLI flag parsing and help

Status: [x] Done

**Description:** Keep the required CLI surface small and exact:
`--yes`, `-y`, `--config <path>`, `--dry-run`, `--json`, `--version`, `-v`,
`--help`, and `-h`. Reject unknown flags and secret-bearing flags.

**Acceptance criteria:**

- [x] `--api-key` and `--api-key=<value>` are rejected before any install work.
- [x] Missing `--config` value fails with a clear error.
- [x] Unknown flags fail with a clear error.
- [x] Help mentions config target, dry-run, JSON, auth env binding, and no secret
      collection.
- [x] Version output matches package/source contract.

**Verification:**

- [x] CLI tests cover every supported flag, unknown flag, missing value, and
      rejected `--api-key`.
- [x] Bin smoke covers `--help` and `--version`.
- [x] `rtk npm run test`

**Dependencies:** Tasks 04-06, 12

**Files likely touched:**

- `src/cli/parse.ts`
- `src/cli/render.ts`
- `src/cli.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium

### Task 20: Make dry-run and JSON output exact

Status: [x] Done

**Description:** Implement dry-run and JSON semantics so automation can trust
the result and stdout stays machine-readable.

**Acceptance criteria:**

- [x] `--dry-run` performs no file or directory writes.
- [x] Dry-run reports `changed` based on the proposed merged content.
- [x] Dry-run creates no backup.
- [x] `--json` emits only valid JSON to stdout.
- [x] `--json` does not prompt; it requires `--yes` or `--dry-run` for
      non-interactive-safe execution.
- [x] JSON success and failure shapes are stable and tested.

**Verification:**

- [x] CLI tests parse stdout JSON for success, dry-run, no-op, and failure.
- [x] Tests assert stderr/stdout separation.
- [x] `rtk npm run test`

**Dependencies:** Tasks 15, 19

**Files likely touched:**

- `src/install/index.ts`
- `src/cli/execute.ts`
- `src/cli/render.ts`
- `test/cli.test.ts`
- `test/install/write.test.ts`

**Estimated scope:** Medium

### Task 21: Make reruns idempotent and honest

Status: [x] Done

**Description:** Define rerun behavior as the official safe update path for the
managed provider catalog: refresh the managed provider when it changes, no-op
when it already matches, and never claim live Pi usability.

**Acceptance criteria:**

- [x] Re-running unchanged setup returns `changed: false`.
- [x] Re-running after model catalog changes updates only `providers.gonkagate`.
- [x] No backup is created on unchanged reruns.
- [x] Changed reruns create a backup before replacement.
- [x] Human output tells users to set `GONKAGATE_API_KEY` themselves and use Pi,
      but does not print a real key.
- [x] Output tells users to open `/model` or restart Pi when needed without
      claiming live verification.

**Verification:**

- [x] Rerun tests cover unchanged, stale managed provider, unrelated providers,
      and catalog refresh.
- [x] CLI output tests assert configured-not-verified wording.
- [x] `rtk npm run test`

**Dependencies:** Tasks 10-20

**Files likely touched:**

- `src/install/index.ts`
- `src/cli/render.ts`
- `test/install/rerun.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium

## Checkpoint after Tasks 19-21

- [x] `rtk npm run ci` passes.
- [x] CLI stdout is valid JSON whenever `--json` is passed.
- [x] Reruns are idempotent and backup behavior is predictable.
- [x] User-facing success says configured, not live verified.

## Phase 8: Cross-platform proof

### Task 22: Prove platform-specific path and write behavior

Status: [ ] Blocked on external GitHub Actions and WSL proof

**Description:** Add focused cross-platform coverage for POSIX, native Windows,
and WSL-relevant path and filesystem behavior.

**Acceptance criteria:**

- [x] Pure unit tests cover Windows path semantics independent of host OS.
- [ ] Native Windows CI covers real path separators, temp dirs, and bin smoke.
- [x] POSIX tests cover owner-only mode where the platform supports it.
- [x] WSL remains a manual smoke checklist unless CI provisions WSL.
- [x] Docs are explicit about what is CI-backed versus manual smoke.

**Verification:**

- [ ] `rtk npm run ci` passes on Ubuntu and native Windows GitHub Actions.
- [ ] Manual WSL checklist is documented and run before claiming WSL confidence.
- [x] No docs claim unsupported platform proof.

**Dependencies:** Tasks 07-21

**Files likely touched:**

- `.github/workflows/ci.yml`
- `test/install/paths.test.ts`
- `test/install/write.test.ts`
- `docs/specs/pi-setup-prd/spec.md`
- `README.md`

**Estimated scope:** Medium

### Task 23: Add packaged CLI smoke tests

Status: [ ] Not started

**Description:** Test the compiled package entrypoints, not only TypeScript
helpers, so the npm shape is proven before release.

**Acceptance criteria:**

- [ ] After build, `rtk node bin/gonkagate-pi.js --help` succeeds.
- [ ] After build, `rtk node bin/gonkagate-pi.js --version` succeeds.
- [ ] After build, `rtk node bin/gonkagate-pi.js --config <tmp> --yes --json`
      writes a valid temp config and emits parseable JSON.
- [ ] `rtk npm pack --dry-run` or equivalent package smoke proves required files
      are included.
- [ ] Smoke tests do not touch real `~/.pi`.

**Verification:**

- [ ] Packaged-bin smoke runs in `rtk npm run test` or a documented CI script.
- [ ] `rtk npm run package:check`
- [ ] `rtk npm run ci`

**Dependencies:** Tasks 12, 19-22

**Files likely touched:**

- `test/cli.test.ts`
- `test/package-contract.test.ts`
- `scripts/run-tests.mjs`
- `package.json`

**Estimated scope:** Medium

## Checkpoint after Tasks 22-23

- [ ] `rtk npm run ci` passes locally.
- [ ] GitHub Actions passes on Ubuntu and native Windows.
- [ ] Packaged-bin smoke proves the npm entrypoint.

## Phase 9: Docs, CI, release readiness

### Task 24: Flip docs from scaffold to shipped runtime

Status: [ ] Not started

**Description:** After implementation and tests pass, update public and internal
docs so they describe the real runtime, not the scaffold, while preserving
explicit current limits.

**Acceptance criteria:**

- [ ] README explains what the tool changes, target path, backup restore, dry-run,
      JSON, `--config`, and auth inputs.
- [ ] `docs/how-it-works.md` explains the shipped v2 install flow, ownership
      model, rerun behavior, and configured-vs-verified semantics.
- [ ] `docs/security.md` explains allowed secret inputs, Pi `auth.json`
      ownership, no shell mutation, backup/restore behavior, redaction, and
      network-free setup.
- [ ] `docs/troubleshooting.md` exists before public release if recurring user
      recovery paths are documented outside README.
- [ ] `docs/model-validation.md` or the PRD records the curated model metadata
      decisions before model catalog claims are expanded.
- [ ] AGENTS current truth is updated only after runtime behavior is actually
      shipped.
- [ ] PRD remains the product source of truth and no longer contradicts runtime
      behavior.
- [ ] CHANGELOG records meaningful user-facing behavior changes.
- [ ] Mirrored skills stay aligned.
- [ ] Docs still say live Pi/GonkaGate verification is deferred unless
      separately implemented.

**Verification:**

- [ ] Docs contract tests cover README, AGENTS, PRD, skills, and no overclaim.
- [ ] `rtk npm run ci`

**Dependencies:** Tasks 01-23

**Files likely touched:**

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/how-it-works.md`
- `docs/security.md`
- `docs/troubleshooting.md`
- `docs/model-validation.md`
- `docs/specs/pi-setup-prd/spec.md`
- `CHANGELOG.md`
- `.agents/skills/pi-setup-development/SKILL.md`
- `.claude/skills/pi-setup-development/SKILL.md`
- `test/docs-contract.test.ts`
- `test/skills-contract.test.ts`

**Estimated scope:** Medium

### Task 25: Tighten CI and release workflow proof

Status: [ ] Not started

**Description:** Ensure CI, release-please, and npm publish workflows match the
production runtime contract without claiming publish readiness before repository
secrets or trusted publishing are configured.

**Acceptance criteria:**

- [ ] CI runs typecheck, build, tests, format check, package check, and packaged
      smoke.
- [ ] CI runs on Ubuntu and native Windows.
- [ ] Publish workflow runs `npm run ci` before publish.
- [ ] Release docs mention trusted publishing or required npm secrets.
- [ ] Release docs do not imply the first npm publish has already happened.

**Verification:**

- [ ] `rtk npm run ci`
- [ ] GitHub Actions dry review confirms Ubuntu and Windows matrix.
- [ ] Package smoke confirms npm files.

**Dependencies:** Tasks 23-24

**Files likely touched:**

- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`
- `release-please-config.json`
- `package.json`
- `README.md`
- `CHANGELOG.md`

**Estimated scope:** Small

### Task 26: Record explicit post-v2 verification design

Status: [ ] Not started

**Description:** Add a deferred design note for any future live Pi/GonkaGate
verification. This is not current implementation work; it prevents accidental
default live calls from slipping into the local-file setup.

**Acceptance criteria:**

- [ ] Future verification requires explicit opt-in design and user consent.
- [ ] Future verification distinguishes local Pi provider visibility from live
      GonkaGate API calls.
- [ ] Future verification never prints or stores a raw `gp-...` key.
- [ ] default setup remains network-free and local-file-only.
- [ ] Docs and tests prevent default live verification claims.

**Verification:**

- [ ] Docs contract test asserts default setup does not contact GonkaGate.
- [ ] `rtk npm run ci`

**Dependencies:** Task 24

**Files likely touched:**

- `docs/specs/pi-setup-prd/spec.md`
- `README.md`
- `test/docs-contract.test.ts`

**Estimated scope:** Small

## Checkpoint after Tasks 24-26

- [ ] `rtk npm run ci` passes.
- [ ] Docs match shipped behavior.
- [ ] Release workflows are truthful about first publication prerequisites.
- [ ] Live verification remains deferred and gated.

## Final readiness gate

Before treating the production runtime as ready:

- [ ] `rtk npm run ci`
- [ ] `rtk npm run typecheck`
- [ ] `rtk npm run test`
- [ ] `rtk npm run format:check`
- [ ] `rtk npm run package:check`
- [ ] Packaged-bin smoke: `rtk node bin/gonkagate-pi.js --help`
- [ ] Packaged-bin smoke: `rtk node bin/gonkagate-pi.js --version`
- [ ] Temp config smoke:
      `rtk node bin/gonkagate-pi.js --config <tmp>/models.json --yes --json`
- [ ] Dry-run smoke:
      `rtk node bin/gonkagate-pi.js --config <tmp>/models.json --dry-run --json`
- [ ] Invalid JSON smoke proves the original config remains untouched.
- [ ] Existing config smoke proves unrelated providers and top-level values are
      preserved.
- [ ] Existing changed config smoke proves backup content and final content.
- [ ] No-op rerun smoke proves no backup and `changed: false`.
- [ ] GitHub Actions passes on Ubuntu and native Windows.
- [ ] Manual WSL smoke is either completed or docs avoid claiming WSL proof
      beyond the documented support target.
- [ ] README, AGENTS, PRD, CHANGELOG, and mirrored skills are aligned with the
      shipped behavior.
- [ ] No CLI path accepts, prints, stores, or logs a real GonkaGate API key.
- [ ] No default live GonkaGate/Pi session verification is claimed or performed.
