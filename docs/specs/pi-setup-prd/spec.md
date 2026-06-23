# GonkaGate Pi Setup PRD

## Status

Draft product contract for `@gonkagate/pi-setup`.

This document defines what the utility should do, how it should behave for
users, and what engineering work is needed before each public capability can
be claimed.

## Product Summary

`@gonkagate/pi-setup` is a small public CLI that configures Pi Coding Agent to
use GonkaGate as a custom model provider.

Recommended public flow:

```bash
npx -y @gonkagate/pi-setup@latest
```

The v2 runtime stays intentionally small: write a curated GonkaGate provider
entry, store the GonkaGate API key in Pi's auth file, and set Pi's default
provider/model. It does not mutate shell profiles, generate `.env` files, or
run live verification by default.

## Problem

Pi already supports custom providers through `~/.pi/agent/models.json`, but a
new GonkaGate user should not need to know Pi's provider schema, model list,
base URL, API type, or safe API-key handling pattern before starting.

The utility should turn that setup into a short guided flow while preserving
Pi's own config files and model-switching behavior.

## Users

- Developers who already use Pi and want to route Pi through GonkaGate.
- GonkaGate users trying Pi for the first time.
- Team/tooling maintainers who want a repeatable non-interactive setup command.

## Goals

- Configure Pi to expose GonkaGate as provider id `gonkagate`.
- Preserve unrelated Pi custom providers and top-level config.
- Use the canonical GonkaGate base URL `https://api.gonkagate.com/v1`.
- Use Pi's OpenAI-compatible API type `openai-completions`.
- Install every public curated GonkaGate model into the provider catalog.
- Keep the recommended public path as one `npx` command.
- Read secrets only from `GONKAGATE_API_KEY`, `--api-key-stdin`, or a hidden
  prompt.
- Store the key only in Pi's `~/.pi/agent/auth.json`.
- Set Pi's default provider and model in `~/.pi/agent/settings.json`.
- Provide dry-run and JSON output for automation.
- Keep CI, package contract checks, and docs aligned with shipped behavior.

## Non-Goals

- Do not implement a full Pi replacement.
- Do not mutate shell profiles.
- Do not generate `.env` files.
- Do not accept secrets through plain CLI flags such as `--api-key`.
- Do not support arbitrary custom base URLs.
- Do not support arbitrary user-provided model ids.
- Do not claim live GonkaGate/Pi session verification until implemented.
- Do not claim concurrent-writer safety for simultaneous setup processes
  unless locking or atomic replacement is explicitly implemented.
- Do not implement a Pi extension or OAuth flow unless later requirements make
  `models.json` insufficient.

## Deferred Work Gates

These features stay out of the current runtime until the listed evidence exists:

- Shell profile mutation: needs supported-shell scope, idempotent edit and
  restore behavior, cross-platform tests, and explicit user consent.
- `.env` generation: needs target-file ownership, git-safety policy, restore
  behavior, and explicit user consent.
- Arbitrary custom base URLs or arbitrary custom model ids: need validation
  rules, support boundaries, docs, tests, and an abuse/security review.
- Concurrent-writer safety claims: need locking or an equivalent design with
  failure-mode tests on supported platforms. Until then, docs must not claim
  simultaneous setup processes are safe.
- Live Pi/GonkaGate verification: needs an explicit opt-in design that separates
  local Pi provider visibility from live GonkaGate API calls, avoids printing or
  storing raw `gp-...` keys, and records user consent before any network check.

The default setup remains network-free and limited to local Pi config files:
`models.json`, `auth.json`, and `settings.json`.

## Current Pi Integration Contract

## Contract Source Map

Current behavior is owned by these files:

- `package.json`: npm package name, public bins, runtime package shape, scripts,
  Node engine, and publishable file list.
- `src/constants.ts`: provider id, provider name, GonkaGate base URL, Pi API
  type, auth env binding, recommended model, and curated model catalog.
- `src/paths.ts`: default Pi `models.json` target and custom config path
  resolution.
- `src/install/user-config.ts`: Pi `auth.json` and `settings.json` merge
  behavior.
- `AGENTS.md`: repository-facing product invariants, security invariants,
  current repository truth, and change discipline.
- `docs/specs/pi-setup-prd/spec.md`: product requirements, current non-goals,
  success semantics, deferred work, and release readiness criteria.

Current setup success means `configured`: the managed provider, Pi auth entry,
and Pi default settings exist or already match. It does not mean `verified`;
live Pi/GonkaGate verification is deferred future work and must stay opt-in
until a separate design approves it.

Managed config target:

```text
~/.pi/agent/models.json
```

Managed provider key:

```text
providers.gonkagate
```

Managed auth key:

```text
gonkagate
```

Managed settings:

```json
{
  "defaultProvider": "gonkagate",
  "defaultModel": "moonshotai/Kimi-K2.6"
}
```

Managed provider config:

```json
{
  "name": "GonkaGate",
  "baseUrl": "https://api.gonkagate.com/v1",
  "api": "openai-completions",
  "apiKey": "$GONKAGATE_API_KEY",
  "models": [
    {
      "id": "qwen/qwen3-235b-a22b-instruct-2507-fp8",
      "name": "Qwen3 235B A22B Instruct"
    },
    {
      "id": "moonshotai/Kimi-K2.6",
      "name": "Kimi K2.6"
    },
    {
      "id": "minimaxai/minimax-m2.7",
      "name": "MiniMax M2.7"
    }
  ]
}
```

Recommended model:

```text
moonshotai/Kimi-K2.6
```

## Model Catalog Requirements

Every curated GonkaGate model entry must have:

- stable provider-facing `id`
- human-readable `name`
- explicit recommended-model ownership in source code
- docs coverage when the public curated list changes
- tests proving every curated model is present in the generated provider config

Before first public release, each curated model must also have an explicit
decision for these Pi model fields:

- `reasoning`
- `input`
- `contextWindow`
- `maxTokens`
- `cost`
- `compat`

The decision may be "use Pi defaults for v1", but it must be intentional and
documented. Do not silently rely on defaults for model behavior that affects
tools, thinking, context limits, usage reporting, or compatibility.

Current metadata decision: every curated model records
`use-pi-default-v1` for `reasoning`, `input`, `contextWindow`, `maxTokens`,
`cost`, and `compat` in `src/constants.ts`. The generated provider config keeps
only the currently supported `id` and `name` fields until product requirements
approve adding more Pi model metadata.

## User Experience

### Interactive Setup

User runs:

```bash
npx -y @gonkagate/pi-setup@latest
```

Expected behavior:

1. CLI resolves the default Pi config directory.
2. CLI lets the user choose a curated GonkaGate model when interactive.
3. CLI reads the API key from `GONKAGATE_API_KEY`, `--api-key-stdin`, or a
   hidden prompt.
4. CLI writes the managed GonkaGate provider.
5. CLI writes the `gonkagate` auth entry.
6. CLI sets Pi defaults to GonkaGate and the selected model.
7. CLI preserves unrelated Pi config and creates backups before replacing
   existing files.
8. CLI prints the next command:

```bash
pi --provider gonkagate --model moonshotai/Kimi-K2.6
```

The CLI must not describe local config-write success as proof of live model
usability.

If Pi is already running while setup changes `models.json`, user guidance must
tell the user to open `/model` or restart Pi before assuming the new provider
is visible in the active session. Current Pi docs say the file reloads when
`/model` is opened; this should be rechecked before claiming stronger behavior.

### Compatibility Setup

User runs:

```bash
npx -y @gonkagate/pi-setup@latest --yes
```

Expected behavior:

- no prompt
- uses the recommended model unless `--model <id>` is provided
- requires `GONKAGATE_API_KEY` or `--api-key-stdin` for non-interactive writes
- `--yes` is accepted for compatibility with existing docs and scripts
- non-zero exit code on parse/write failure

### Dry Run

User runs:

```bash
npx -y @gonkagate/pi-setup@latest --dry-run
```

Expected behavior:

- no file writes
- result says whether the target config would change
- no backup is created

### Machine-Readable Output

User runs:

```bash
npx -y @gonkagate/pi-setup@latest --json
```

Expected behavior:

- output is valid JSON
- JSON includes config/auth/settings paths, changed flag, backup paths when
  present, selected model id, and model ids
- no human-only text is mixed into stdout

## Functional Requirements

### Config Resolution

- Default target is `~/.pi/agent/models.json`.
- `--config <path>` overrides the target path for development, testing, and
  advanced users.
- `~` and `~/...` are expanded to the current user's home directory.
- Missing parent directories are created when writing.

### Config Parsing

- Existing config must be valid JSON object.
- Non-object JSON must fail with a clear error.
- Invalid JSON must fail without replacing the file.
- The current runtime does not need JSONC support unless Pi's documented file format requires
  comments later.

### Merge Behavior

- Preserve unrelated top-level keys.
- Preserve unrelated providers.
- Replace only `providers.gonkagate`.
- Keep output deterministic and formatted with two-space JSON.
- Write a newline at EOF.

### Backup Behavior

- If a managed file exists and content changes, copy it to a timestamped
  sibling backup before writing.
- If the file does not exist, no backup is needed.
- If the merged content is identical, do not rewrite or create a backup.

### Write Safety And Recovery

- A failed parse must leave the target file untouched.
- A failed backup must stop the write.
- A failed write must exit non-zero and report the target path.
- If a backup was created before a later failure, diagnostics must include the
  backup path.
- Public docs must describe how to restore from a backup.
- Restore from a backup by copying the generated `models.json.backup-*` file
  back over `~/.pi/agent/models.json`.
- Restore auth/settings by copying the matching `auth.json.backup-*` or
  `settings.json.backup-*` file back over the affected file.
- Atomic replacement is preferred before first public release; if omitted, the
  release notes must not claim crash-safe writes.

### Success Semantics

The CLI has two levels of success:

1. `configured`: the GonkaGate provider entry was written or already matched.
2. `verified`: Pi itself proves that the provider/model is available.

The current runtime may claim only `configured` unless effective Pi verification
is implemented.
Dry-run may claim only `would_change` or `already_configured`.

### Error Reporting

Errors must be concise and actionable for:

- unknown flags
- missing flag values
- invalid JSON
- non-object JSON
- missing home directory
- permission-denied reads or writes
- backup failure
- write failure

Machine-readable `--json` failures are a future capability unless explicitly
implemented.

### CLI Surface

Required flags:

- `--yes`, `-y`
- `--model <id>`
- `--api-key-stdin`
- `--config <path>`
- `--dry-run`
- `--json`
- `--version`, `-v`
- `--help`, `-h`

Prohibited flags:

- `--api-key`
- any other plain flag that carries a secret value

## Security Requirements

- Never print a GonkaGate `gp-...` key.
- Never ask for a key outside the hidden prompt.
- Never write repository-local secrets.
- Store secrets only in Pi `~/.pi/agent/auth.json`.
- Never mutate shell profile files.
- Never generate `.env` files.
- Never perform telemetry or analytics in the setup runtime.
- Never contact GonkaGate during default setup.
- Treat Pi's own `--api-key` flag, if present, as a Pi capability. This utility
  must not expose or recommend an equivalent secret-bearing flag.

## Compatibility Requirements

- Runtime: Node.js `>=22.14.0`.
- Module contract: ESM package, compiled by `tsc`, executed from `dist/`.
- Source imports must use runtime-correct `.js` relative specifiers.
- Local platform target: macOS, Linux, native Windows, and WSL.
- CI must run on Ubuntu and native Windows before claiming native Windows
  support.
- Path resolution must support POSIX `HOME`, Windows `USERPROFILE`, and
  `HOMEDRIVE` plus `HOMEPATH`.
- Package publication must pass `publint`.

### Platform Proof

- CI-backed proof: GitHub Actions is configured to run `npm run ci` on
  `ubuntu-latest` and `windows-latest`.
- Test-backed path proof: unit tests cover POSIX, native Windows,
  HOMEDRIVE/HOMEPATH fallback, and Git-Bash-style `~` inputs.
- POSIX permission proof: local tests assert owner-only target file mode where
  the platform exposes POSIX mode bits.
- Manual WSL smoke checklist before claiming WSL-specific confidence:
  1. Run `rtk npm run ci` inside WSL.
  2. Run a temp config smoke inside WSL:
     `rtk node bin/gonkagate-pi.js --config <tmp>/models.json --yes --json`.
  3. Confirm docs still describe WSL as manual unless that smoke has current
     evidence.
- Until that checklist is run, docs must not describe WSL behavior as
  CI-backed proof.

## Documentation Requirements

Public docs must cover:

- what the tool changes
- where Pi config is written
- how to provide the API key safely
- how to run dry-run mode
- how to use a custom config path
- what is intentionally out of scope
- what success means before live Pi verification exists
- how backup restore works
- how to run local validation

Internal docs must cover:

- product invariants in `AGENTS.md`
- local commands in `RTK.md`
- current source of truth for this PRD
- mirrored skill contract under `.agents/skills/` and `.claude/skills/`

## Validation Requirements

Before any change is treated as ready:

```bash
npm run ci
```

The CI baseline must include:

- TypeScript typecheck
- build
- focused node:test coverage
- Prettier check
- package contract check through `publint`

The initial tests must prove:

- provider config shape
- merge preservation
- non-object config rejection
- path resolution
- CLI write path
- backup creation
- non-interactive key-source behavior
- package metadata contract
- mirrored skill integrity

## Release Requirements

- Package name: `@gonkagate/pi-setup`.
- Public bins:
  - `pi-setup`
  - `gonkagate-pi`
- License: Apache-2.0.
- Release automation: release-please.
- Publish automation: npm provenance/trusted publishing path.
- First real publication requires repository-side npm trusted publishing
  configuration.

## Future Capabilities

These are not current requirements, but should be considered as later task
groups.

### Pi Presence Check

Possible future behavior:

- detect whether `pi` is installed
- report version when available
- warn if Pi's custom-provider behavior is too old or incompatible

### Effective Setup Verification

Possible future behavior:

- run a Pi command that lists models or validates provider availability
- prove that `gonkagate` appears with the curated models
- avoid sending live prompts unless the user explicitly asks for a live smoke
  check

### Model Picker

Current behavior:

- show curated model list interactively
- let user choose Pi's default GonkaGate model
- keep every curated model in the provider catalog

### Pi Extension

Possible future behavior:

- package a Pi extension only if `models.json` cannot cover required
  onboarding, OAuth, dynamic model discovery, or team-wide configuration.

## Open Questions

- Should release block until Pi presence detection is implemented?
- Do we want to support Pi's own `/login` flow later, or is direct
  `auth.json` ownership enough for GonkaGate v2?
- What Pi versions should be considered supported once we add a version check?
- Do we need JSONC preservation if real Pi users commonly hand-edit
  `models.json` with comments?
- Should first public release require atomic replacement, or is backup-first
  direct writing acceptable?
- Should curated model entries include explicit `reasoning`, `contextWindow`,
  `maxTokens`, `cost`, and `compat` metadata before publication?

## Acceptance Criteria For V2

- `npx -y @gonkagate/pi-setup@latest` creates or updates
  `~/.pi/agent/models.json`.
- The setup writes only the `gonkagate` API-key entry in
  `~/.pi/agent/auth.json`.
- The setup sets `defaultProvider` and `defaultModel` in
  `~/.pi/agent/settings.json`.
- Existing unrelated providers remain unchanged.
- Existing unrelated auth/settings entries remain unchanged.
- Existing managed files receive backups before replacement.
- Re-running against an already managed config is idempotent.
- `--dry-run` performs no writes.
- `--json` emits valid machine-readable output.
- The tool never accepts a secret through plain `--api-key`.
- The tool never prints a raw `gp-...` key.
- The tool does not claim live Pi usability unless live verification is
  implemented.
- Docs describe the exact user flow and security model.
- Docs describe restore from backup.
- `npm run ci` passes locally and in GitHub Actions on Ubuntu and Windows.

## Task-Planning Seeds

Use this PRD to create implementation tasks in this rough order:

1. Lock product contract and docs.
2. Protect package metadata, docs, and skill mirror with tests.
3. Implement config-path resolution.
4. Implement provider config generation.
5. Decide curated model metadata policy.
6. Implement parse/merge/stringify behavior.
7. Implement backup and write flow.
8. Document backup restore.
9. Implement CLI flags and output modes.
10. Add CLI integration tests.
11. Add CI and package validation.
12. Add release and publish workflows.
13. Reassess open questions before adding live verification or Pi extension
    packaging.
