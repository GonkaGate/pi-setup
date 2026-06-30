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

The v2 runtime stays intentionally small: fetch GonkaGate models from
`/v1/models`, write a GonkaGate provider entry, store the GonkaGate API key in
Pi's auth file, and set Pi's default provider/model. It does not mutate shell
profiles, generate `.env` files, or run live chat verification by default.

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
- Install the setup-time `/v1/models` response into the provider catalog.
- Keep the public setup path as one `npx` command.
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
- Do not support arbitrary user-provided model ids outside `/v1/models`.
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
- Arbitrary custom base URLs or model ids outside `/v1/models`: need validation
  rules, support boundaries, docs, tests, and an abuse/security review.
- Concurrent-writer safety claims: need locking or an equivalent design with
  failure-mode tests on supported platforms. Until then, docs must not claim
  simultaneous setup processes are safe.
- Live Pi/GonkaGate verification: needs an explicit opt-in design that
  separates the setup-time `/v1/models` metadata request from live chat/Pi
  verification, avoids printing or storing raw `gp-...` keys, and records user
  consent before any verification check.

The default setup makes only the `/v1/models` metadata request, then writes
local Pi config files: `models.json`, `auth.json`, and `settings.json`.

## Current Pi Integration Contract

## Contract Source Map

Current behavior is owned by these files:

- `package.json`: npm package name, public bins, runtime package shape, scripts,
  Node engine, and publishable file list.
- `src/constants.ts`: provider id, provider name, GonkaGate base URL, models
  URL, Pi API type, and auth env binding.
- `src/install/deps.ts`: setup-time `/v1/models` fetching and model picker I/O.
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
  "defaultModel": "dynamic/model-id"
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
      "id": "dynamic/model-id",
      "name": "dynamic/model-id"
    }
  ]
}
```

Default model source:

```text
first model returned by /v1/models unless --model selects another fetched id
```

## Model Catalog Requirements

GonkaGate `/v1/models` is the source of truth for setup-time model ids. The
repository must not require a code or docs change when public GonkaGate models
are added or removed.

Every fetched GonkaGate model entry used in provider config must have:

- stable provider-facing `id`
- Pi provider `name`, using the API name when present and falling back to `id`
- tests proving fetched models are present in the generated provider config

The generated provider config keeps only the currently supported `id` and `name`
fields until product requirements approve adding more Pi model metadata.

## User Experience

### Interactive Setup

User runs:

```bash
npx -y @gonkagate/pi-setup@latest
```

Expected behavior:

1. CLI resolves the default Pi config directory.
2. CLI reads the API key from `GONKAGATE_API_KEY`, `--api-key-stdin`, or a
   hidden prompt.
3. CLI fetches available models from GonkaGate `/v1/models`.
4. CLI lets the user choose a fetched GonkaGate model with an arrow-key model
   picker when interactive.
5. CLI writes the managed GonkaGate provider.
6. CLI writes the `gonkagate` auth entry.
7. CLI sets Pi defaults to GonkaGate and the selected model.
8. CLI preserves unrelated Pi config and creates backups before replacing
   existing files.
9. CLI prints the next command:

```bash
pi --provider gonkagate --model dynamic/model-id
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
- uses the first fetched model unless `--model <id>` is provided
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
- still requires an API-key source because model ids come from `/v1/models`

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
- prove that `gonkagate` appears with the fetched models
- avoid sending live prompts unless the user explicitly asks for a live smoke
  check

### Model Picker

Current behavior:

- fetch `/v1/models` after API-key input
- show fetched model list with an arrow-key model picker interactively
- let user choose Pi's default GonkaGate model
- keep fetched models in the provider catalog

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
- Do we need cache/refresh behavior if `/v1/models` changes after setup?

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
5. Implement setup-time `/v1/models` fetch and dynamic model picker.
6. Implement parse/merge/stringify behavior.
7. Implement backup and write flow.
8. Document backup restore.
9. Implement CLI flags and output modes.
10. Add CLI integration tests.
11. Add CI and package validation.
12. Add release and publish workflows.
13. Reassess open questions before adding live verification or Pi extension
    packaging.
