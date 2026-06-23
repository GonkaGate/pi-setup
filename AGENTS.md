@/Users/daniil/.codex/RTK.md

--- project-doc ---

# AGENTS.md

## What This Repository Is

`pi-setup` is the public open-source onboarding repository for the GonkaGate
CLI that configures local Pi Coding Agent to use GonkaGate as a custom model
provider.

Recommended public flow:

```bash
npx -y @gonkagate/pi-setup@latest --yes
```

Current honest state:

- the repository is a minimal development scaffold with a working TypeScript
  CLI, tests, docs, CI, release workflows, and a mirrored local skill
- the CLI writes or dry-runs a managed `providers.gonkagate` entry in
  `~/.pi/agent/models.json`
- v1 setup remains config-only
- the CLI does not collect, print, or store GonkaGate API keys
- the initial auth contract is Pi-native env binding through
  `$GONKAGATE_API_KEY`
- this repo does not yet verify live Pi sessions or mutate `auth.json`
- setup success means `configured`, not live `verified`

If implementation status, package name, config path, provider id, model list,
or secret-handling behavior changes, update this file in the same change.

## Product Goal

The intended minimal happy path is:

1. user runs `npx -y @gonkagate/pi-setup@latest --yes`
2. installer resolves the Pi `models.json` path
3. installer preserves unrelated Pi model providers
4. installer upserts the curated GonkaGate provider config
5. user exports `GONKAGATE_API_KEY=gp-...`
6. user returns to plain `pi`

## Fixed Product Invariants

- the npm package is `@gonkagate/pi-setup`
- the intended public npm entrypoint is `npx -y @gonkagate/pi-setup@latest --yes`
- the stable provider id is `gonkagate`
- the canonical base URL is `https://api.gonkagate.com/v1`
- the current Pi API type is `openai-completions`
- the durable Pi custom-model config target is `~/.pi/agent/models.json`
- the managed provider key is `providers.gonkagate`
- the managed provider catalog includes every public curated GonkaGate model
- the CLI must preserve unrelated providers and top-level config values
- the initial auth binding is exactly `apiKey: "$GONKAGATE_API_KEY"`
- no plain CLI flag may carry the secret
- the installer must not write directly to `~/.pi/agent/auth.json`
- shell profile mutation is out of scope
- `.env` file generation is out of scope
- arbitrary custom base URLs are out of scope for v1
- arbitrary custom model ids are out of scope for v1
- concurrent-writer safety is not claimed without locking or an equivalent
  design
- live GonkaGate/Pi session verification is out of scope for the initial
  scaffold
- deferred features require the evidence gates in the PRD before implementation

## Security Invariants

- never print a GonkaGate `gp-...` key
- never accept secrets through plain flags such as `--api-key`
- never store secrets in repository-local files
- do not write `auth.json` until that behavior is explicitly designed
- keep project config commit-safe by default
- create a backup before replacing an existing `models.json`
- document restore by copying the generated backup back over `models.json`

## Current Repository Truth

- `src/cli.ts` is the runtime entrypoint
- `bin/gonkagate-pi.js` is a thin wrapper over `dist/cli.js`
- `src/config.ts` owns the Pi `models.json` merge behavior
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
