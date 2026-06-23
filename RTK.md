# RTK.md

## Local Commands

```bash
npm run typecheck
npm run test
npm run format:check
npm run package:check
npm run ci
```

## Repository Rules

- Keep the runtime small: manage Pi `models.json`, `auth.json`, and
  `settings.json`; do not build a Pi replacement.
- Preserve unrelated user config when editing Pi config files.
- Keep `apiKey: "$GONKAGATE_API_KEY"` in the provider config for Pi custom
  provider compatibility.
- Allowed secret inputs are `GONKAGATE_API_KEY`, `--api-key-stdin`, and the
  hidden prompt. Do not add a plain `--api-key` flag.
- Do not mutate shell profiles or generate `.env` files.
- Use `.js` relative import specifiers in TypeScript source because production
  runs compiled ESM from `dist/`.
- Update tests before claiming a new installer behavior.
