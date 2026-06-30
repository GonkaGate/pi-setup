# How It Works

Pi supports custom providers through `~/.pi/agent/models.json`. This package
fetches current models from GonkaGate `/v1/models`, then upserts a single
managed provider:

```json
{
  "providers": {
    "gonkagate": {
      "name": "GonkaGate",
      "baseUrl": "https://api.gonkagate.com/v1",
      "api": "openai-completions",
      "apiKey": "$GONKAGATE_API_KEY",
      "models": [{ "id": "dynamic/model-id", "name": "dynamic/model-id" }]
    }
  }
}
```

The CLI reads any existing JSON object, preserves unrelated keys, replaces only
`providers.gonkagate`, writes a backup when the target file already exists, and
then writes the updated JSON. The managed model list comes from setup-time
`/v1/models`, not a repository registry.

For v2 it also updates two Pi-native user files beside `models.json`:

- `auth.json`: writes only the `gonkagate` API-key entry.
- `settings.json`: sets `defaultProvider` and `defaultModel`.

The API key comes from `GONKAGATE_API_KEY`, `--api-key-stdin`, or a hidden
prompt. The CLI uses it to fetch `/v1/models`, never accepts `--api-key`, and
never prints raw `gp-...` keys.

Interactive terminals use an arrow-key picker for the fetched model list.

Every changed existing file gets a sibling `*.backup-*` file before replacement.
If a later write fails, already-written files are rolled back from their backup
or removed when newly created.

The setup does not mutate shell profiles, generate `.env` files, accept
arbitrary base URLs or model ids outside `/v1/models`, or verify a live
Pi/GonkaGate chat session by default.
