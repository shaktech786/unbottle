import { getClaudeClient, getUserApiKey } from "@/lib/ai/claude";
import { buildProducerSystemPrompt } from "@/lib/ai/prompts/producer";
import { PRODUCER_TOOLS } from "@/lib/ai/tools";
import type { Section, Track } from "@/lib/music/types";

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

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = claude.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            messages,
            tools: PRODUCER_TOOLS,
          });

          stream.on("text", (textDelta) => {
            const event = `data: ${JSON.stringify({ type: "token", content: textDelta })}\n\n`;
            controller.enqueue(encoder.encode(event));
          });

          // Handle tool use - when the AI calls a tool, send it as an action event
          stream.on("contentBlock", (block) => {
            if (block.type === "tool_use") {
              const event = `data: ${JSON.stringify({
                type: "action",
                toolName: block.name,
                toolInput: block.input,
              })}\n\n`;
              controller.enqueue(encoder.encode(event));
            }
          });

          stream.on("error", (error) => {
            const event = `data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`;
            controller.enqueue(encoder.encode(event));
            controller.close();
          });

          // Wait for the stream to finish, then check if we need a follow-up
          const finalMessage = await stream.finalMessage();

          // If the response ended with tool_use, we need to send back tool results
          // and get the AI's follow-up text response
          const toolUseBlocks = finalMessage.content.filter(
            (block) => block.type === "tool_use",
          );

          if (toolUseBlocks.length > 0 && finalMessage.stop_reason === "tool_use") {
            // Build tool results (all succeed since client handles them)
            const toolResults = toolUseBlocks.map((block) => ({
              type: "tool_result" as const,
              tool_use_id: (block as { id: string }).id,
              content: "Done. The changes have been applied to the workspace.",
            }));

            // Get follow-up response from Claude
            const followUp = claude.messages.stream({
              model: "claude-sonnet-4-20250514",
              max_tokens: 2048,
              system: systemPrompt,
              messages: [
                ...messages,
                { role: "assistant", content: finalMessage.content },
                { role: "user", content: toolResults },
              ],
            });

            followUp.on("text", (textDelta) => {
              const event = `data: ${JSON.stringify({ type: "token", content: textDelta })}\n\n`;
              controller.enqueue(encoder.encode(event));
            });

            followUp.on("error", (error) => {
              const event = `data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`;
              controller.enqueue(encoder.encode(event));
            });

            await followUp.finalMessage();
          }

          const doneEvent = `data: ${JSON.stringify({ type: "done" })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));
          controller.close();
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Stream setup failed";
          const event = `data: ${JSON.stringify({ type: "error", content: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(event));
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
