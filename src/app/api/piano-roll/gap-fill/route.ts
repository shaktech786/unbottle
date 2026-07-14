import { generateCompletion, getUserApiKey } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  buildGapFillSystemPrompt,
  buildGapFillUserMessage,
  parseSuggestedNotes,
  suggestedNotesToNotes,
  type GapFillContext,
} from "@/lib/ai/prompts/piano-roll-gap-fill";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export async function POST(request: Request) {
  try {
    if (supabaseConfigured) {
      const client = await createClient();
      await requireAuth(client);
    }

    const body = (await request.json()) as GapFillContext & { trackId?: string };
    const { notes, totalBars, bpm, keySignature, timeSignature, trackId = "default" } = body;

    if (!Array.isArray(notes)) {
      return Response.json({ error: "notes array is required" }, { status: 400 });
    }

    const ctx: GapFillContext = { notes, totalBars: totalBars ?? 16, bpm, keySignature, timeSignature };

    const userApiKey = getUserApiKey(request);
    const rawText = await generateCompletion(
      buildGapFillSystemPrompt(),
      buildGapFillUserMessage(ctx),
      1024,
      userApiKey,
    );

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: "AI returned invalid JSON", raw: rawText }, { status: 502 });
    }

    const rawSuggestions = parseSuggestedNotes(parsed);
    const suggestions = suggestedNotesToNotes(rawSuggestions, trackId, nanoid(6));

    return Response.json({ suggestions });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
