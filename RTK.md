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

- Keep the first runtime small: update Pi `models.json`, do not manage Pi
  credentials yet.
- Preserve unrelated user config when editing `models.json`.
- Keep `GONKAGATE_API_KEY` as an env binding, not a stored secret.
- Use `.js` relative import specifiers in TypeScript source because production
  runs compiled ESM from `dist/`.
- Update tests before claiming a new installer behavior.
