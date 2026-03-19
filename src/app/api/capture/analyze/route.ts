import { type NextRequest } from "next/server";
import { generateCompletion, getUserApiKey } from "@/lib/ai/claude";
import { buildCaptureAnalysisPrompt } from "@/lib/ai/prompts/capture-analysis";

export const dynamic = "force-dynamic";

interface CaptureAnalyzeBody {
  type: "audio" | "tap" | "text";
  textDescription?: string;
  detectedPitches?: string[];
  detectedBpm?: number;
  sessionKey?: string;
  sessionGenre?: string;
}

const VALID_CAPTURE_TYPES = new Set(["audio", "tap", "text"]);

// POST /api/capture/analyze - analyze a musical capture via AI
export async function POST(request: NextRequest) {
  let body: CaptureAnalyzeBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.type || !VALID_CAPTURE_TYPES.has(body.type)) {
    return Response.json(
      { error: "type must be one of: audio, tap, text" },
      { status: 400 },
    );
  }

  const apiKey = getUserApiKey(request);

  const systemPrompt =
    "You are Unbottle's music analysis AI. Analyze the musical input and return ONLY valid JSON.";

  const userMessage = buildCaptureAnalysisPrompt({
    type: body.type,
    textDescription: body.textDescription,
    detectedPitches: body.detectedPitches,
    detectedBpm: body.detectedBpm,
    sessionKey: body.sessionKey,
    sessionGenre: body.sessionGenre,
  });

  try {
    const rawResponse = await generateCompletion(
      systemPrompt,
      userMessage,
      2048,
      apiKey,
    );

    // Parse the AI response as JSON
    let analysis: unknown;
    try {
      analysis = JSON.parse(rawResponse);
    } catch {
      // If the AI returned non-JSON, wrap it
      return Response.json(
        { error: "AI returned non-JSON response", raw: rawResponse },
        { status: 502 },
      );
    }

    return Response.json({ analysis });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to analyze capture";
    return Response.json({ error: message }, { status: 500 });
  }
}
