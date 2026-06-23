# Security

`pi-setup` stores a GonkaGate API key only in Pi's user auth file:
`~/.pi/agent/auth.json`.

Allowed secret inputs:

- `GONKAGATE_API_KEY`
- `--api-key-stdin`
- hidden interactive prompt

The managed provider config still uses this Pi-native env binding so custom
models load consistently with Pi's provider schema:

```json
{
  "apiKey": "$GONKAGATE_API_KEY"
}
```

Security rules:

- no `--api-key` flag
- no raw `gp-...` key in stdout or stderr
- no repository-local secret storage
- no shell profile mutation
- no `.env` generation
- no arbitrary custom base URLs or arbitrary custom model ids
- no default live Pi/GonkaGate verification
- backup before replacing existing `models.json`, `auth.json`, or
  `settings.json`
