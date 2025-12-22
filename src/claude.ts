import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";

const client = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function chat(messages: Message[]): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 1024,
    system:
      "You are a helpful assistant in a Discord server. Keep responses concise and Discord-friendly. Use markdown sparingly.",
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "I couldn't generate a response.";
}
