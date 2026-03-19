import {
  generateMusic,
  getUserElevenLabsKey,
} from "@/lib/audio/elevenlabs";
import { buildMusicPrompt } from "@/lib/audio/music-prompt";

export const dynamic = "force-dynamic";

interface AudioGenerateRequestBody {
  prompt?: string;
  description?: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  keySignature?: string;
  instruments?: string[];
  sectionType?: string;
  duration?: number;
  forceInstrumental?: boolean;
  sessionId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AudioGenerateRequestBody;

    // Build the prompt: use explicit prompt if provided, otherwise compose from params
    const prompt =
      body.prompt?.trim() ||
      buildMusicPrompt({
        description: body.description,
        genre: body.genre,
        mood: body.mood,
        bpm: body.bpm,
        keySignature: body.keySignature,
        instruments: body.instruments,
        sectionType: body.sectionType,
      });

    if (!prompt) {
      return Response.json(
        { error: "A prompt or description is required" },
        { status: 400 },
      );
    }

    const duration = body.duration ?? 30;
    if (duration < 5 || duration > 120) {
      return Response.json(
        { error: "Duration must be between 5 and 120 seconds" },
        { status: 400 },
      );
    }

    const forceInstrumental = body.forceInstrumental ?? true;
    const userApiKey = getUserElevenLabsKey(request);

    const result = await generateMusic(
      { prompt, duration, forceInstrumental },
      userApiKey,
    );

    return new Response(result.audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Length": String(result.audioBuffer.byteLength),
        "Content-Disposition": `attachment; filename="unbottle-audio.mp3"`,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    // Surface missing-key errors as 401
    if (message.includes("No ElevenLabs API key")) {
      return Response.json({ error: message }, { status: 401 });
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
