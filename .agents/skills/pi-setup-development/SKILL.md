---
name: pi-setup-development
description: Use when changing the GonkaGate Pi setup CLI, its docs, tests, package contract, CI, or local repository instructions.
---

# Pi Setup Development

This repository owns `@gonkagate/pi-setup`, a small CLI for configuring Pi
Coding Agent with GonkaGate.

Current runtime contract:

- public entrypoint: `npx @gonkagate/pi-setup`
- package bin: `bin/gonkagate-pi.js`
- runtime entrypoint: `src/cli.ts`
- config target: `~/.pi/agent/models.json`
- auth target: `~/.pi/agent/auth.json`
- settings target: `~/.pi/agent/settings.json`
- managed key: `providers.gonkagate`
- base URL: `https://api.gonkagate.com/v1`
- Pi API type: `openai-completions`
- auth binding: `apiKey: "$GONKAGATE_API_KEY"`
- model list source: setup-time `GET /v1/models`
- interactive model selection: arrow-key picker
- setup success: `configured`, not live `verified`

Rules:

- preserve unrelated Pi config when editing `models.json`
- preserve unrelated Pi auth/settings entries when editing `auth.json` and
  `settings.json`
- create a backup before replacing an existing managed Pi config file
- document restore by copying the generated backup back over the affected file
- never accept or print `gp-...` secrets
- allowed secret inputs are `GONKAGATE_API_KEY`, `--api-key-stdin`, and a hidden
  prompt
- never add a plain `--api-key` flag
- do not mutate shell profiles
- do not generate `.env` files
- do not add arbitrary custom base URLs or model ids outside `/v1/models`
- do not claim default live GonkaGate/Pi verification
- keep TypeScript imports runtime-correct for compiled ESM
- run `npm run ci` before calling the change ready

Use the smallest useful implementation. Pi already owns credential storage,
model switching, and custom-provider loading; this CLI should only write the
small Pi-native config entries needed for GonkaGate.
