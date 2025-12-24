import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";

const client = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Sends messages to Claude and returns the response.
 * @throws {Anthropic.APIError} Network issues, rate limits, or authentication failures
 * @throws {Error} Empty response or no text content in response
 */
export async function chat(messages: Message[]): Promise<string> {
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 1024,
      system:
        "You are a helpful assistant in a Discord server. Keep responses concise and Discord-friendly. Use markdown sparingly.",
      messages,
    });

    if (!response.content || response.content.length === 0) {
      console.error("API returned empty content array");
      throw new Error("Empty response from API");
    }

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || !textBlock.text) {
      console.error("No text block in response:", response.content);
      throw new Error("No text content in response");
    }

    return textBlock.text;
  } catch (error) {
    console.error("Anthropic API error:", error);
    throw error;
  }
}
