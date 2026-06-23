# Security

`pi-setup` does not accept or store GonkaGate API keys in the initial runtime.

The managed provider config uses this Pi-native env binding:

```json
{
  "apiKey": "$GONKAGATE_API_KEY"
}
```

Users should export `GONKAGATE_API_KEY` themselves or use Pi's own
credential-management flow when appropriate.

Security rules:

- no `--api-key` flag
- no repository-local secret storage
- no `auth.json` writes
- no shell profile mutation
- no `.env` generation
- backup before replacing an existing `models.json`
