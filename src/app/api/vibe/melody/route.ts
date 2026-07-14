/**
 * POST /api/vibe/melody
 * MAIN-54: Melody sketch generation from vibe text description
 *
 * Body: { vibe: VibeInput, chords: string[], key: string, bpm: number }
 * Response: { notes: Array<{ pitch, startTick, durationTicks, velocity }> }
 */

import { generateCompletionFull, getUserApiKey } from "@/lib/ai/claude";
import { validateVibeInput, VibeInputValidationError } from "@/lib/vibe/schema";
import { PPQ } from "@/lib/music/types";
import type { Note } from "@/lib/music/types";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { logUsage } from "@/lib/log-usage";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

const SYSTEM_PROMPT = `You are a professional music producer and composer AI. Generate a short melody sketch that fits the given vibe and chord context.

Respond with ONLY valid JSON in this exact shape (no markdown, no code fences):
{
  "notes": [
    { "pitch": "C4", "startTick": 0, "durationTicks": 480, "velocity": 80 },
    { "pitch": "E4", "startTick": 480, "durationTicks": 240, "velocity": 70 }
  ]
}

Rules:
- pitch: standard pitch notation like C4, F#4, Bb3 (octave 3-6)
- startTick: position in ticks (PPQ=480, so one quarter note = 480 ticks)
- durationTicks: length in ticks (minimum 120, quarter note = 480)
- velocity: 40-110 (vary for expression)
- Generate 8-16 notes forming a 2-bar melodic phrase
- The melody should clearly suggest the mood and energy
- Use notes from the given key/chord context
- Low energy = longer, more sustained notes; high energy = shorter, faster notes
- Avoid overly chromatic or random sequences — make it musical and singable`;

function buildMelodyPrompt(args: {
  vibe: { mood: string; energy: number; genre?: string; description?: string };
  chords: string[];
  key: string;
  bpm: number;
}): string {
  const parts = [
    `Mood: ${args.vibe.mood}`,
    `Energy: ${args.vibe.energy}/5`,
    `Key: ${args.key}`,
    `BPM: ${args.bpm}`,
    `Chord progression: ${args.chords.join(" → ")}`,
  ];
  if (args.vibe.genre) parts.push(`Genre: ${args.vibe.genre}`);
  if (args.vibe.description) parts.push(`Context: ${args.vibe.description}`);
  return parts.join("\n");
}

interface RawNote {
  pitch?: unknown;
  startTick?: unknown;
  durationTicks?: unknown;
  velocity?: unknown;
}

const VALID_PITCH_RE = /^[A-G]#?b?[0-8]$/;

function parseNotes(raw: unknown, trackId: string): Omit<Note, "id">[] {
  if (!Array.isArray(raw)) return [];

  const notes: Omit<Note, "id">[] = [];
  for (const n of raw as RawNote[]) {
    const pitch = String(n.pitch ?? "").trim();
    if (!VALID_PITCH_RE.test(pitch)) continue;

    const startTick = Math.max(0, Math.round(Number(n.startTick ?? 0)));
    const durationTicks = Math.max(
      Math.round(PPQ / 4), // minimum: 16th note
      Math.round(Number(n.durationTicks ?? PPQ)),
    );
    const velocity = Math.max(1, Math.min(127, Math.round(Number(n.velocity ?? 80))));

    notes.push({
      trackId,
      pitch: pitch as Note["pitch"],
      startTick,
      durationTicks,
      velocity,
    });
  }

  return notes;
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
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Request body required" }, { status: 400 });
    }

    const { vibe: rawVibe, chords, key, bpm, trackId } = body as {
      vibe: unknown;
      chords: unknown;
      key: unknown;
      bpm: unknown;
      trackId: unknown;
    };

    const vibe = validateVibeInput(rawVibe);

    if (!Array.isArray(chords) || chords.length === 0) {
      return Response.json({ error: "chords array is required" }, { status: 400 });
    }

    const resolvedKey = typeof key === "string" && key ? key : "C major";
    const resolvedBpm = typeof bpm === "number" ? Math.round(bpm) : 120;
    const resolvedTrackId = typeof trackId === "string" && trackId ? trackId : "melody-track";

    const prompt = buildMelodyPrompt({
      vibe,
      chords: chords as string[],
      key: resolvedKey,
      bpm: resolvedBpm,
    });

    const { text: rawText, model, usage } = await generateCompletionFull(
      SYSTEM_PROMPT,
      prompt,
      1024,
      userApiKey,
    );

    if (authedUserId) {
      void logUsage({
        userId: authedUserId,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        model,
        endpoint: "/api/vibe/melody",
      });
    }

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    let parsed: { notes?: unknown };
    try {
      parsed = JSON.parse(cleaned) as { notes?: unknown };
    } catch {
      return Response.json(
        { error: "Failed to parse AI melody response" },
        { status: 502 },
      );
    }

    const notes = parseNotes(parsed.notes, resolvedTrackId);
    if (notes.length === 0) {
      return Response.json({ error: "AI returned no valid notes" }, { status: 502 });
    }

    return Response.json({ notes });
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
