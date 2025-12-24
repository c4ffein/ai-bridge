import {
  Client,
  GatewayIntentBits,
  Message as DiscordMessage,
  Partials,
} from "discord.js";
import { config } from "./config";
import { chat, type Message } from "./claude";

// Log but don't crash - isolated promise failures shouldn't kill other requests
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Sync exceptions are suspicious - exit and let Docker restart
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message],
});

const CONTEXT_MESSAGE_COUNT = 100;
const DISCORD_MAX_LENGTH = 2000;

function stripMention(content: string, botId: string): string {
  return content.replace(new RegExp(`<@!?${botId}>`, "g"), "").trim();
}

/**
 * Fetches recent messages from the channel for context.
 * @throws {DiscordAPIError} Missing permissions, channel deleted, or rate limited
 */
async function fetchContextMessages(
  message: DiscordMessage
): Promise<Message[]> {
  const messages = await message.channel.messages.fetch({
    limit: CONTEXT_MESSAGE_COUNT,
    before: message.id,
  });

  const sortedMessages = [...messages.values()].reverse();

  return sortedMessages.map((msg) => ({
    role: msg.author.id === client.user?.id ? "assistant" : "user",
    content:
      msg.author.id === client.user?.id
        ? msg.content
        : `${msg.author.displayName}: ${msg.content}`,
  })) as Message[];
}

/**
 * Splits a long response into chunks and sends them to Discord.
 * Errors are caught and logged internally; does not throw.
 */
async function splitAndSend(
  message: DiscordMessage,
  response: string
): Promise<void> {
  if (response.length <= DISCORD_MAX_LENGTH) {
    try {
      await message.reply(response);
    } catch (error) {
      console.error("Error sending reply:", error);
    }
    return;
  }

  const chunks: string[] = [];
  let remaining = response;

  while (remaining.length > 0) {
    if (remaining.length <= DISCORD_MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf("\n", DISCORD_MAX_LENGTH);
    if (splitIndex === -1 || splitIndex < DISCORD_MAX_LENGTH / 2) {
      splitIndex = remaining.lastIndexOf(" ", DISCORD_MAX_LENGTH);
    }
    if (splitIndex === -1 || splitIndex < DISCORD_MAX_LENGTH / 2) {
      splitIndex = DISCORD_MAX_LENGTH;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trim();
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    try {
      if (i === 0) {
        await message.reply(chunk);
      } else if ("send" in message.channel) {
        await message.channel.send(chunk);
      }
    } catch (error) {
      console.error(`Error sending chunk ${i + 1}/${chunks.length}:`, error);
      return; // Stop - partial messages are worse than none
    }
  }
}

// Discord client error handlers
client.on("error", (error) => {
  console.error("Discord client error:", error);
});

client.on("warn", (warning) => {
  console.warn("Discord client warning:", warning);
});

client.on("shardDisconnect", (event, shardId) => {
  console.error(`Shard ${shardId} disconnected (code ${event.code}), will not reconnect`);
});

client.on("shardReconnecting", (shardId) => {
  console.warn(`Shard ${shardId} reconnecting...`);
});

client.on("shardError", (error, shardId) => {
  console.error(`Shard ${shardId} WebSocket error:`, error);
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user?.tag}`);
  console.log(`Restricted to guild: ${config.allowedGuildId}`);
});

client.on("messageCreate", async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Check if in allowed guild
  if (message.guildId !== config.allowedGuildId) return;

  // Check if bot is mentioned
  if (!message.mentions.has(client.user!)) return;

  const userMessage = stripMention(message.content, client.user!.id);

  if (!userMessage) {
    await message.reply("Hey! What can I help you with?").catch((err) => {
      console.error("Error sending empty message reply:", err);
    });
    return;
  }

  // Catches errors from fetchContextMessages and chat
  try {
    await message.channel.sendTyping();

    const contextMessages = await fetchContextMessages(message);
    const allMessages: Message[] = [
      ...contextMessages,
      { role: "user", content: `${message.author.displayName}: ${userMessage}` },
    ];

    const response = await chat(allMessages);
    await splitAndSend(message, response);
  } catch (error) {
    console.error("Error processing message:", error);

    try {
      if (error instanceof Error && error.message.includes("rate")) {
        await message.reply(
          "I'm being rate limited. Please try again in a moment."
        );
      } else {
        await message.reply("Sorry, I encountered an error processing your message.");
      }
    } catch (replyError) {
      console.error("Error sending error reply:", replyError);
    }
  }
});

client.login(config.discordToken).catch((error) => {
  console.error("Failed to login to Discord:", error);
  process.exit(1);
});
