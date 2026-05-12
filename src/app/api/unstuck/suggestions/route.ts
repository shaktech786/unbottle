import { getClaudeClient } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

const BYO_KEY_HEADER = "x-anthropic-key";

interface SuggestionsRequestBody {
  idleMinutes: number;
  genre?: string;
  bpm?: number;
  trackCount?: number;
}

export async function POST(request: Request) {
  try {
    if (supabaseConfigured) {
      const client = await createClient();
      await requireAuth(client);
    }

    const userApiKey = request.headers.get(BYO_KEY_HEADER) || undefined;
    const body = (await request.json()) as SuggestionsRequestBody;
    const { idleMinutes, genre, bpm, trackCount } = body;

    const context = [
      genre ? `genre: ${genre}` : null,
      bpm ? `BPM: ${bpm}` : null,
      trackCount !== undefined ? `${trackCount} track${trackCount !== 1 ? "s" : ""} in session` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const prompt = `A music producer has been idle for ${idleMinutes} minutes on their beat${context ? ` (${context})` : ""}. They seem stuck. Give exactly 3 short, specific, actionable next steps to get them unstuck. Each suggestion should be one sentence, concrete, and immediately doable. Return JSON: { "suggestions": ["...", "...", "..."] }`;

    const claude = getClaudeClient(userApiKey);

    const response = await claude.messages.create({
      model: "claude-haiku-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Failed to parse suggestions" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as { suggestions: string[] };
    return Response.json({ suggestions: parsed.suggestions.slice(0, 3) });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
