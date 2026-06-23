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
- managed key: `providers.gonkagate`
- base URL: `https://api.gonkagate.com/v1`
- Pi API type: `openai-completions`
- auth binding: `apiKey: "$GONKAGATE_API_KEY"`
- setup success: `configured`, not live `verified`

Rules:

- preserve unrelated Pi config when editing `models.json`
- create a backup before replacing an existing `models.json`
- document restore by copying the generated backup back over `models.json`
- never accept or print `gp-...` secrets
- do not write `~/.pi/agent/auth.json` without an explicit product change
- do not mutate shell profiles
- do not generate `.env` files
- do not add arbitrary custom base URLs or arbitrary custom model ids
- do not claim default live GonkaGate/Pi verification
- keep TypeScript imports runtime-correct for compiled ESM
- run `npm run ci` before calling the change ready

Use the smallest useful implementation. Pi already owns credential storage,
model switching, and custom-provider loading; this CLI should not duplicate
those systems unless the product contract changes.
