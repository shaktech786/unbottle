import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export interface StreamChatOptions {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}

export async function streamChat({ systemPrompt, messages, maxTokens = 4096 }: StreamChatOptions) {
  const claude = getClaudeClient();

  return claude.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
}

export async function generateCompletion(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  const claude = getClaudeClient();

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}
