import { getClaudeClient, getUserApiKey } from "@/lib/ai/claude";
import { buildProducerSystemPrompt } from "@/lib/ai/prompts/producer";
import { PRODUCER_TOOLS } from "@/lib/ai/tools";
import type { Section, Track } from "@/lib/music/types";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";

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
  };
}

export async function POST(request: Request) {
  try {
    if (supabaseConfigured) {
      const client = await createClient();
      await requireAuth(client);
    }

    const body = (await request.json()) as ChatRequestBody;
    const { message, history, context } = body;

    if (!message?.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const systemPrompt = buildProducerSystemPrompt({
      bpm: context?.bpm ?? 120,
      keySignature: context?.keySignature ?? "C major",
      timeSignature: context?.timeSignature ?? "4/4",
      genre: context?.genre,
      mood: context?.mood,
      sections: context?.sections,
      tracks: context?.tracks,
    });

    const userApiKey = getUserApiKey(request);
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
            model: "claude-sonnet-4-20250514",
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
                model: "claude-sonnet-4-20250514",
                max_tokens: 2048,
                system: systemPrompt,
                messages: [
                  ...messages,
                  { role: "assistant" as const, content: finalMessage.content },
                  { role: "user" as const, content: toolResultContent },
                ],
              });

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
