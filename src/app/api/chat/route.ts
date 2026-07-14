import { getClaudeClient } from "@/lib/ai/claude";
import { buildProducerSystemPrompt } from "@/lib/ai/prompts/producer";
import { PRODUCER_TOOLS } from "@/lib/ai/tools";
import type { Section, Track } from "@/lib/music/types";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { logUsage } from "@/lib/log-usage";
import { buildStyleContext } from "@/lib/style/build-style-context";
import { mapStyleProfileRow, type StyleProfileRow } from "@/lib/style/schema";

const BYO_KEY_HEADER = "x-anthropic-key";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  sessionId: string;
  message: string;
  history?: HistoryMessage[];
  context?: {
    bpm?: number;
    keySignature?: string;
    timeSignature?: string;
    genre?: string;
    mood?: string;
    sections?: Section[];
    tracks?: Track[];
    /** Idea summary from IdeaContext.buildIdeaSummary() */
    ideaContext?: string | null;
  };
}

export async function POST(request: Request) {
  try {
    let authedUserId: string | null = null;

    if (supabaseConfigured) {
      const client = await createClient();
      const user = await requireAuth(client);
      authedUserId = user.id;
    }

    const userApiKey = request.headers.get(BYO_KEY_HEADER) || undefined;
    const hasByoKey = Boolean(userApiKey);

    if (authedUserId && !hasByoKey) {
      const rateLimit = await checkRateLimit(authedUserId);
      if (!rateLimit.allowed) {
        return Response.json(
          { error: "Rate limit exceeded" },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimit.retryAfter ?? 3600),
            },
          },
        );
      }
    }

    const body = (await request.json()) as ChatRequestBody;
    const { message, history, context } = body;

    if (!message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // Fetch style profile for the authed user (best-effort)
    let styleContext: string | null = null;
    if (authedUserId && supabaseConfigured) {
      try {
        const profileClient = await createClient();
        const { data: profileRow } = await profileClient
          .from("style_profiles")
          .select("*")
          .eq("user_id", authedUserId)
          .maybeSingle();
        if (profileRow) {
          styleContext = buildStyleContext(mapStyleProfileRow(profileRow as StyleProfileRow));
        }
      } catch {
        // Non-fatal — proceed without style context
      }
    }

    const systemPrompt = buildProducerSystemPrompt({
      bpm: context?.bpm ?? 120,
      keySignature: context?.keySignature ?? "C major",
      timeSignature: context?.timeSignature ?? "4/4",
      genre: context?.genre,
      mood: context?.mood,
      sections: context?.sections,
      tracks: context?.tracks,
      styleContext,
      ideaContext: context?.ideaContext,
    });

    const claude = getClaudeClient(userApiKey);

    const validHistory: { role: "user" | "assistant"; content: string }[] = (
      history ?? []
    ).filter((m) => m.content && (m.role === "user" || m.role === "assistant"));

    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...validHistory,
      { role: "user", content: message },
    ];

    const encoder = new TextEncoder();

    function sendSSE(controller: ReadableStreamDefaultController, data: Record<string, unknown>) {
      const event = `data: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(event));
    }

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Stream the first API call — tokens arrive in real time
          const stream = claude.messages.stream({
            model: "claude-sonnet-5",
            max_tokens: 4096,
            system: systemPrompt,
            messages,
            tools: PRODUCER_TOOLS,
          });

          // Track tool use blocks as they arrive
          const toolUseBlocks: Map<number, { id: string; name: string; jsonBuf: string }> = new Map();

          for await (const event of stream) {
            switch (event.type) {
              case "content_block_start": {
                if (event.content_block.type === "tool_use") {
                  toolUseBlocks.set(event.index, {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    jsonBuf: "",
                  });
                }
                break;
              }

              case "content_block_delta": {
                if (event.delta.type === "text_delta") {
                  // Stream text tokens immediately
                  sendSSE(controller, { type: "token", content: event.delta.text });
                } else if (event.delta.type === "input_json_delta") {
                  // Buffer tool input JSON incrementally
                  const block = toolUseBlocks.get(event.index);
                  if (block) {
                    block.jsonBuf += event.delta.partial_json;
                  }
                }
                break;
              }

              case "content_block_stop": {
                // When a tool_use block finishes, emit the action event
                const block = toolUseBlocks.get(event.index);
                if (block) {
                  let toolInput: Record<string, unknown> = {};
                  try {
                    toolInput = JSON.parse(block.jsonBuf) as Record<string, unknown>;
                  } catch {
                    // Malformed tool JSON — send empty input
                  }
                  sendSSE(controller, {
                    type: "action",
                    toolName: block.name,
                    toolInput,
                  });
                  toolUseBlocks.delete(event.index);
                }
                break;
              }
            }
          }

          // Get the final completed message to check stop_reason
          const finalMessage = await stream.finalMessage();

          let totalInputTokens = finalMessage.usage.input_tokens;
          let totalOutputTokens = finalMessage.usage.output_tokens;
          const responseModel = finalMessage.model;

          // If the model called tools, do a follow-up to get the summary text
          if (finalMessage.stop_reason === "tool_use") {
            const toolBlocks = finalMessage.content.filter(
              (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use",
            );

            const toolResultContent: Anthropic.Messages.ToolResultBlockParam[] = toolBlocks.map((block) => ({
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: "Done. The changes have been applied to the workspace.",
            }));

            try {
              const followUp = await claude.messages.create({
                model: "claude-sonnet-5",
                max_tokens: 2048,
                system: systemPrompt,
                messages: [
                  ...messages,
                  { role: "assistant" as const, content: finalMessage.content },
                  { role: "user" as const, content: toolResultContent },
                ],
              });

              totalInputTokens += followUp.usage.input_tokens;
              totalOutputTokens += followUp.usage.output_tokens;

              for (const block of followUp.content) {
                if (block.type === "text" && block.text) {
                  sendSSE(controller, { type: "token", content: block.text });
                }
              }
            } catch (followUpErr) {
              // Follow-up failed but tools already executed — send a fallback message
              const fallback = followUpErr instanceof Error ? followUpErr.message : "Follow-up failed";
              console.error("Chat follow-up error:", fallback);
              sendSSE(controller, {
                type: "token",
                content: "\n\nI've set everything up for you. Hit play to hear it!",
              });
            }
          }

          if (authedUserId) {
            void logUsage({
              userId: authedUserId,
              tokensInput: totalInputTokens,
              tokensOutput: totalOutputTokens,
              model: responseModel,
              endpoint: "/api/chat",
            });
          }

          sendSSE(controller, { type: "done" });
          controller.close();
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Stream setup failed";
          sendSSE(controller, { type: "error", content: errorMessage });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
