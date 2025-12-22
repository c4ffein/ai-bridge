function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  discordToken: getEnvOrThrow("DISCORD_TOKEN"),
  anthropicApiKey: getEnvOrThrow("ANTHROPIC_API_KEY"),
  allowedGuildId: getEnvOrThrow("ALLOWED_GUILD_ID"),
};
