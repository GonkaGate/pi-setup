# @gonkagate/pi-setup

Configure Pi Coding Agent to use GonkaGate as an OpenAI-compatible custom
provider with one `npx` command.

```bash
npx -y @gonkagate/pi-setup@latest
```

![Package](https://img.shields.io/badge/package-%40gonkagate%2Fpi--setup-6E63FF?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D22.14.0-4DA2FF?style=flat-square)
![Pi%20Coding%20Agent](https://img.shields.io/badge/Pi%20Coding%20Agent-custom%20provider-35D6FF?style=flat-square)
![License](https://img.shields.io/badge/license-Apache--2.0-2A2A2A?style=flat-square)

[![Website](https://img.shields.io/badge/Website-gonkagate.com-111827?style=flat-square)](https://gonkagate.com/en?utm_source=github&utm_medium=referral&utm_campaign=pi_setup&utm_content=readme_badge_website)
[![Docs](https://img.shields.io/badge/Docs-API%20Guides-2563EB?style=flat-square)](https://gonkagate.com/en/docs?utm_source=github&utm_medium=referral&utm_campaign=pi_setup&utm_content=readme_badge_docs)
[![API%20Key](https://img.shields.io/badge/API%20Key-Dashboard-F97316?style=flat-square)](https://gonkagate.com/en/register?utm_source=github&utm_medium=referral&utm_campaign=pi_setup&utm_content=readme_badge_api_key)
[![Telegram](https://img.shields.io/badge/Telegram-%40gonkagate-229ED9?style=flat-square&logo=telegram&logoColor=white)](https://t.me/gonkagate)
[![X](https://img.shields.io/badge/X-%40gonkagate-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/gonkagate)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-GonkaGate-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/company/gonkagate)

`@gonkagate/pi-setup` is the onboarding CLI for developers who use Pi Coding
Agent and want to route models through the GonkaGate API without hand-editing
Pi's provider, auth, or default-model config.

## What It Does

- Writes a `providers.gonkagate` entry to `~/.pi/agent/models.json`.
- Preserves unrelated Pi providers and top-level config.
- Reads your API key from `GONKAGATE_API_KEY`, `--api-key-stdin`, or a hidden
  prompt.
- Fetches the current GonkaGate model list from `/v1/models` using that API key.
- Shows an arrow-key model picker in interactive terminals.
- Writes a Pi-compatible `gonkagate` API-key entry to
  `~/.pi/agent/auth.json`.
- Sets `defaultProvider` and `defaultModel` in `~/.pi/agent/settings.json`.
- Creates sibling backups before replacing existing managed files.
- Installs the fetched GonkaGate model list for Pi Coding Agent.
- Does not accept a plain `--api-key` flag and never prints `gp-...` keys.

Setup success means `configured`: GonkaGate config and Pi auth/default settings
were written or already matched. It does not mean `verified`; default setup only
calls `/v1/models` for model metadata and does not verify a live Pi chat
session.

## Quick Start

```bash
npx -y @gonkagate/pi-setup@latest
pi
```

For automation, avoid shell history by using stdin:

```bash
printf '%s' "$GONKAGATE_API_KEY" | npx -y @gonkagate/pi-setup@latest --yes --api-key-stdin
```

Preview the generated config without writing:

```bash
npx -y @gonkagate/pi-setup@latest --dry-run
```

Dry runs still need an API-key source because model choices come from
`/v1/models`.

Use a custom config path during testing:

```bash
npx -y @gonkagate/pi-setup@latest --config ./models.json
```

Restore from a backup by copying the generated `models.json.backup-*` file back
over `~/.pi/agent/models.json`. Auth and settings backups use the same sibling
pattern beside `auth.json` and `settings.json`.

## Limits

The setup only makes the `/v1/models` metadata request. It does not mutate shell
profiles, generate `.env` files, accept `--api-key`, support arbitrary custom
base URLs, support arbitrary custom model ids outside `/v1/models`, claim
concurrent-writer safety, or run default live GonkaGate/Pi verification.

Deferred features require the evidence gates in
[`docs/specs/pi-setup-prd/spec.md`](docs/specs/pi-setup-prd/spec.md) before
implementation.

## Platform Proof

CI is configured for Ubuntu and native Windows. WSL remains a manual smoke
target; do not claim WSL-specific proof until the checklist in the PRD has been
run inside WSL.

## Development

```bash
npm install
npm run ci
```

Release Please opens release PRs only from Conventional Commits on `main`.
Use `feat: ...` for user-facing setup behavior and `fix: ...` for user-facing
bug fixes. When squash-merging, make the squash title conventional;
`[codex] ...` and plain titles will not trigger an npm release.

Product requirements live in
[`docs/specs/pi-setup-prd/spec.md`](docs/specs/pi-setup-prd/spec.md).

The package is intentionally small. It configures Pi's documented custom
provider, API-key auth, and default-model settings surfaces.
