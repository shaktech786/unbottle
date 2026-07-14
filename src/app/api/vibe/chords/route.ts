/**
 * POST /api/vibe/chords
 * MAIN-52: Vibe-to-chord progression generator via AI
 *
 * Body: VibeInput
 * Response: { chords: string[], key: string, bpm: number }
 */

import { generateCompletionFull, getUserApiKey } from "@/lib/ai/claude";
import { validateVibeInput, VibeInputValidationError } from "@/lib/vibe/schema";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { logUsage } from "@/lib/log-usage";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

const SYSTEM_PROMPT = `You are a professional music producer AI. Given a vibe description, you generate a chord progression.

Respond with ONLY valid JSON in this exact shape (no markdown, no code fences):
{
  "chords": ["Cmaj7", "Am7", "Fmaj7", "G7"],
  "key": "C major",
  "bpm": 90
}

Rules:
- chords: array of 4–8 chord symbols using standard notation (e.g. Cmaj7, F#m, Bb7, Gsus4)
- key: the tonal center (e.g. "C major", "A minor", "F# dorian")
- bpm: integer between 60 and 180 that fits the energy level
- Energy 1-2 = slower BPM (60-90), 3 = mid (90-120), 4-5 = faster (120-180)`;

function buildVibePrompt(vibe: {
  mood: string;
  energy: number;
  genre?: string;
  reference?: string;
  description?: string;
}): string {
  const parts = [
    `Mood: ${vibe.mood}`,
    `Energy level: ${vibe.energy}/5`,
  ];
  if (vibe.genre) parts.push(`Genre: ${vibe.genre}`);
  if (vibe.reference) parts.push(`Reference: ${vibe.reference}`);
  if (vibe.description) parts.push(`Context: ${vibe.description}`);
  return parts.join("\n");
}

interface ChordResponse {
  chords: string[];
  key: string;
  bpm: number;
}

export async function POST(request: Request) {
  try {
    let authedUserId: string | null = null;

    if (supabaseConfigured) {
      const client = await createClient();
      const user = await requireAuth(client);
      authedUserId = user.id;
    }

    const userApiKey = getUserApiKey(request);
    const hasByoKey = Boolean(userApiKey);

    if (authedUserId && !hasByoKey) {
      const rateLimit = await checkRateLimit(authedUserId, "chat");
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

    const body = await request.json().catch(() => null);
    const vibe = validateVibeInput(body);

    const prompt = buildVibePrompt(vibe);
    const { text: rawText, model, usage } = await generateCompletionFull(
      SYSTEM_PROMPT,
      prompt,
      512,
      userApiKey,
    );

    if (authedUserId) {
      void logUsage({
        userId: authedUserId,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        model,
        endpoint: "/api/vibe/chords",
      });
    }

    // Strip markdown fences if present
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    let parsed: ChordResponse;
    try {
      parsed = JSON.parse(cleaned) as ChordResponse;
    } catch {
      return Response.json(
        { error: "Failed to parse AI chord response" },
        { status: 502 },
      );
    }

    // Validate response shape
    if (!Array.isArray(parsed.chords) || parsed.chords.length === 0) {
      return Response.json({ error: "AI returned no chords" }, { status: 502 });
    }

    const bpm = Math.max(60, Math.min(180, Math.round(parsed.bpm ?? 120)));
    const key = typeof parsed.key === "string" ? parsed.key : "C major";
    const chords = parsed.chords
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      .map((c) => c.trim());

    return Response.json({ chords, key, bpm });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (err instanceof VibeInputValidationError) {
      return Response.json(
        { error: err.message, field: err.field },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
