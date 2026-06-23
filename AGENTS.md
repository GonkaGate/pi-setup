@/Users/daniil/.codex/RTK.md

--- project-doc ---

# AGENTS.md

## What This Repository Is

`pi-setup` is the public open-source onboarding repository for the GonkaGate
CLI that configures local Pi Coding Agent to use GonkaGate as a custom model
provider.

Recommended public flow:

```bash
npx -y @gonkagate/pi-setup@latest
```

Current honest state:

- the repository is a minimal development scaffold with a working TypeScript
  CLI, tests, docs, CI, release workflows, and a mirrored local skill
- the CLI writes or dry-runs a managed `providers.gonkagate` entry in
  `~/.pi/agent/models.json`
- the CLI reads a GonkaGate API key from `GONKAGATE_API_KEY`,
  `--api-key-stdin`, or a hidden prompt
- the CLI writes a Pi-compatible `gonkagate` API-key entry in
  `~/.pi/agent/auth.json`
- the CLI sets `defaultProvider` and `defaultModel` in
  `~/.pi/agent/settings.json`
- this repo does not yet verify live Pi sessions
- setup success means `configured`, not live `verified`

If implementation status, package name, config path, provider id, model list,
or secret-handling behavior changes, update this file in the same change.

## Product Goal

The intended minimal happy path is:

1. user runs `npx -y @gonkagate/pi-setup@latest`
2. installer resolves the Pi `models.json` path
3. installer lets the user choose a curated GonkaGate model or uses the
   recommended model in non-interactive mode
4. installer upserts the curated GonkaGate provider config
5. installer stores the API key in Pi `auth.json` without printing it
6. installer sets Pi defaults in `settings.json`
7. user returns to plain `pi`

## Fixed Product Invariants

- the npm package is `@gonkagate/pi-setup`
- the intended public npm entrypoint is `npx -y @gonkagate/pi-setup@latest`
- the stable provider id is `gonkagate`
- the canonical base URL is `https://api.gonkagate.com/v1`
- the current Pi API type is `openai-completions`
- the durable Pi custom-model config target is `~/.pi/agent/models.json`
- the durable Pi auth config target is `~/.pi/agent/auth.json`
- the durable Pi settings config target is `~/.pi/agent/settings.json`
- the managed provider key is `providers.gonkagate`
- the managed auth key is `gonkagate`
- the managed provider catalog includes every public curated GonkaGate model
- the CLI must preserve unrelated providers and top-level config values
- the provider auth binding remains exactly `apiKey: "$GONKAGATE_API_KEY"`
- the allowed secret inputs are `GONKAGATE_API_KEY`, `--api-key-stdin`, and a
  hidden interactive prompt
- no plain CLI flag may carry the secret
- shell profile mutation is out of scope
- `.env` file generation is out of scope
- arbitrary custom base URLs are out of scope
- arbitrary custom model ids are out of scope
- concurrent-writer safety is not claimed without locking or an equivalent
  design
- live GonkaGate/Pi session verification is out of scope for the initial
  scaffold
- deferred features require the evidence gates in the PRD before implementation

## Security Invariants

- never print a GonkaGate `gp-...` key
- never accept secrets through plain flags such as `--api-key`
- never store secrets in repository-local files
- keep project config commit-safe by default
- create a backup before replacing existing `models.json`, `auth.json`, or
  `settings.json`
- document restore by copying the generated backup back over the affected file

## Current Repository Truth

- `src/cli.ts` is the runtime entrypoint
- `bin/gonkagate-pi.js` is a thin wrapper over `dist/cli.js`
- `src/config.ts` owns the Pi `models.json` merge behavior
- `src/install/user-config.ts` owns the Pi `auth.json` and `settings.json`
  merge behavior
- `src/constants.ts` owns the GonkaGate provider and curated model contract
- `src/paths.ts` owns default Pi path resolution
- `docs/specs/pi-setup-prd/spec.md` is the current product requirements
  document and task-planning source
- `.agents/skills/` and `.claude/skills/` contain a mirrored
  `pi-setup-development` skill
- `.github/workflows/ci.yml` runs on Ubuntu and Windows
- release-please and npm publish workflows are present but require repository
  secrets/trusted publishing configuration before first release

## Repository Structure

```text
.
├── AGENTS.md
├── RTK.md
├── README.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── bin/
├── docs/
├── scripts/
├── src/
└── test/
```

## Change Discipline

When behavior changes:

- update `AGENTS.md`
- update `README.md`
- update relevant files in `docs/`
- update `CHANGELOG.md` when the change is meaningful to users
- update tests under `test/`
- keep `.agents/skills/` and `.claude/skills/` mirrored

## Validation

Current local validation baseline:

```bash
npm run ci
```

@RTK.md
