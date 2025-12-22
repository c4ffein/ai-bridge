# ai-bridge

KISS bridge between AI providers and messengers (only Claude on Discord for now)

## Environment variables

```
DISCORD_TOKEN=your_discord_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key
ALLOWED_GUILD_ID=your_discord_server_id
```

## Development

```bash
bun install
bun run src/index.ts
```

## Docker deployment

Build:

```bash
docker build -t ai-bridge .
```

Run:

```bash
docker run -d --name ai-bridge --restart unless-stopped \
  -e DISCORD_TOKEN=xxx \
  -e ANTHROPIC_API_KEY=xxx \
  -e ALLOWED_GUILD_ID=xxx \
  ai-bridge
```

For production, just wrap the docker run command in any service manager for automatic startup and management.
