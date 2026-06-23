# @gonkagate/pi-setup

Configure Pi Coding Agent to use GonkaGate as an OpenAI-compatible custom
provider with one `npx` command.

```bash
npx @gonkagate/pi-setup
```

![Package](https://img.shields.io/badge/package-%40gonkagate%2Fpi--setup-6E63FF?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D22.14.0-4DA2FF?style=flat-square)
![Pi%20Coding%20Agent](https://img.shields.io/badge/Pi%20Coding%20Agent-custom%20provider-35D6FF?style=flat-square)
![License](https://img.shields.io/badge/license-Apache--2.0-2A2A2A?style=flat-square)

[![Website](https://img.shields.io/badge/Website-gonkagate.com-111827?style=flat-square)](https://gonkagate.com/en)
[![Docs](https://img.shields.io/badge/Docs-API%20Guides-2563EB?style=flat-square)](https://gonkagate.com/en/docs)
[![API%20Key](https://img.shields.io/badge/API%20Key-Dashboard-F97316?style=flat-square)](https://gonkagate.com/en/register)
[![Telegram](https://img.shields.io/badge/Telegram-%40gonkagate-229ED9?style=flat-square&logo=telegram&logoColor=white)](https://t.me/gonkagate)
[![X](https://img.shields.io/badge/X-%40gonkagate-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/gonkagate)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-GonkaGate-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/company/gonkagate)

`@gonkagate/pi-setup` is the config-only onboarding CLI for developers who use
Pi Coding Agent and want to route models through the GonkaGate API without
hand-editing Pi's `~/.pi/agent/models.json` provider catalog.

## What It Does

- Writes a `providers.gonkagate` entry to `~/.pi/agent/models.json`.
- Preserves unrelated Pi providers and top-level config.
- Uses Pi's native `$GONKAGATE_API_KEY` env binding.
- Does not collect or store your API key.
- Creates a sibling backup before replacing an existing `models.json`.
- Installs the curated GonkaGate model catalog for Pi Coding Agent.

Setup success means `configured`: GonkaGate is present in `models.json`. It does
not mean `verified`; a live Pi session may still need to load the provider and
GonkaGate may still need a valid user-provided key.

## Quick Start

```bash
npx @gonkagate/pi-setup --yes
export GONKAGATE_API_KEY=gp-...
pi --provider gonkagate --model moonshotai/Kimi-K2.6
```

Preview the generated config without writing:

```bash
npx @gonkagate/pi-setup --dry-run
```

Use a custom config path during testing:

```bash
npx @gonkagate/pi-setup --config ./models.json --yes
```

Restore from a backup by copying the generated `models.json.backup-*` file back
over `~/.pi/agent/models.json`.

## V1 Limits

The setup is config-only and network-free. It does not write
`~/.pi/agent/auth.json`, mutate shell profiles, generate `.env` files, accept
`--api-key`, collect secrets, support arbitrary custom base URLs, support
arbitrary custom model ids, claim concurrent-writer safety, or run default live
GonkaGate/Pi verification.

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

Product requirements live in
[`docs/specs/pi-setup-prd/spec.md`](docs/specs/pi-setup-prd/spec.md).

The package is intentionally small. It configures Pi's documented
`models.json` custom-provider surface and leaves secret storage to Pi or the
user's shell environment.
