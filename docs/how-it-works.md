# How It Works

Pi supports custom providers through `~/.pi/agent/models.json`. This package
upserts a single managed provider:

```json
{
  "providers": {
    "gonkagate": {
      "name": "GonkaGate",
      "baseUrl": "https://api.gonkagate.com/v1",
      "api": "openai-completions",
      "apiKey": "$GONKAGATE_API_KEY",
      "models": [{ "id": "moonshotai/Kimi-K2.6" }]
    }
  }
}
```

The CLI reads any existing JSON object, preserves unrelated keys, replaces only
`providers.gonkagate`, writes a backup when the target file already exists, and
then writes the updated JSON.

For v2 it also updates two Pi-native user files beside `models.json`:

- `auth.json`: writes only the `gonkagate` API-key entry.
- `settings.json`: sets `defaultProvider` and `defaultModel`.

The API key comes from `GONKAGATE_API_KEY`, `--api-key-stdin`, or a hidden
prompt. The CLI never accepts `--api-key` and never prints raw `gp-...` keys.

Every changed existing file gets a sibling `*.backup-*` file before replacement.
If a later write fails, already-written files are rolled back from their backup
or removed when newly created.

The setup does not mutate shell profiles, generate `.env` files, accept
arbitrary base URLs or model ids, or verify a live Pi/GonkaGate session by
default.
