import { streamChat, getUserApiKey } from "@/lib/ai/claude";
import { buildProducerSystemPrompt } from "@/lib/ai/prompts/producer";
import type { Section, Track } from "@/lib/music/types";

export const dynamic = "force-dynamic";

interface ChatRequestBody {
  sessionId: string;
  message: string;
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
    const { message, context } = body;

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

    const stream = await streamChat({
      systemPrompt,
      messages: [{ role: "user", content: message }],
      apiKey: userApiKey,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          stream.on("text", (textDelta) => {
            const event = `data: ${JSON.stringify({ type: "token", content: textDelta })}\n\n`;
            controller.enqueue(encoder.encode(event));
          });

          stream.on("error", (error) => {
            const event = `data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`;
            controller.enqueue(encoder.encode(event));
            controller.close();
          });

          stream.on("end", () => {
            const event = `data: ${JSON.stringify({ type: "done" })}\n\n`;
            controller.enqueue(encoder.encode(event));
            controller.close();
          });
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
