import { getClaudeClient, getUserApiKey } from "@/lib/ai/claude";
import { buildProducerSystemPrompt } from "@/lib/ai/prompts/producer";
import { PRODUCER_TOOLS } from "@/lib/ai/tools";
import type { Section, Track } from "@/lib/music/types";
import type Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

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
          // First API call — may return text, tool_use, or both
          const response = await claude.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            messages,
            tools: PRODUCER_TOOLS,
          });

          // Process all content blocks from the response
          for (const block of response.content) {
            if (block.type === "text" && block.text) {
              sendSSE(controller, { type: "token", content: block.text });
            } else if (block.type === "tool_use") {
              sendSSE(controller, {
                type: "action",
                toolName: block.name,
                toolInput: block.input,
              });
            }
          }

          // If the model called tools, do a follow-up to get the summary text
          if (response.stop_reason === "tool_use") {
            const toolUseBlocks = response.content.filter(
              (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use",
            );

            const toolResultContent: Anthropic.Messages.ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
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
                  { role: "assistant" as const, content: response.content },
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
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
