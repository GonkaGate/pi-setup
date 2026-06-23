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

It does not write `auth.json`, mutate shell profiles, generate `.env` files, or
verify a live Pi session yet.
