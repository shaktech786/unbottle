import Anthropic from "@anthropic-ai/sdk";

// Cache clients by API key to avoid recreating on every request
const clientCache = new Map<string, Anthropic>();

/**
 * Get a Claude client. Uses the user-provided key if available,
 * falls back to the server's ANTHROPIC_API_KEY env var.
 */
export function getClaudeClient(userApiKey?: string): Anthropic {
  const key = userApiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("No Anthropic API key available. Please provide your own key in Settings.");
  }

  const cached = clientCache.get(key);
  if (cached) return cached;

  const client = new Anthropic({ apiKey: key });
  clientCache.set(key, client);
  return client;
}

/**
 * Extract user's API key from request headers.
 * Users can pass their own key via the x-anthropic-key header.
 */
export function getUserApiKey(request: Request): string | undefined {
  return request.headers.get("x-anthropic-key") || undefined;
}

export interface StreamChatOptions {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  apiKey?: string;
}

export async function streamChat({ systemPrompt, messages, maxTokens = 4096, apiKey }: StreamChatOptions) {
  const claude = getClaudeClient(apiKey);

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
  maxTokens = 4096,
  apiKey?: string,
): Promise<string> {
  const claude = getClaudeClient(apiKey);

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}
