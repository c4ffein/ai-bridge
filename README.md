# ai-bridge

KISS bridge between AI providers and messengers (only Claude on Discord for now)

## Environment variables

Create a `.env` file (or `/etc/ai-bridge/environment.env` for production):

```bash
# Docker --env-file format: KEY=value, no quotes, no 'export'

# Discord bot token from https://discord.com/developers/applications
DISCORD_TOKEN=your_discord_bot_token

# Anthropic API key from https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key

# Your Discord server's guild ID (right-click server → Copy Server ID with Developer Mode enabled)
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
  --env-file .env \
  ai-bridge
```

For production, just wrap the docker run command in any service manager for automatic startup and management.

`--env-file` keeps secrets out of shell history and `ps` output. Make sure the file has `chmod 600` permissions and isn't checked into version control. Ideally this file is mounted from a secrets manager.
