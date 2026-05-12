import type { Note, Pitch } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";

export interface GapFillContext {
  notes: Note[];
  totalBars: number;
  bpm?: number;
  keySignature?: string;
  timeSignature?: string;
}

/** Describes a suggested note in the LLM response. */
export interface SuggestedNoteRaw {
  pitch: string;
  startBeat: number;
  durationBeats: number;
  velocity?: number;
}

/** Parse and validate the raw LLM output into typed suggested notes. */
export function parseSuggestedNotes(raw: unknown): SuggestedNoteRaw[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is SuggestedNoteRaw =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as SuggestedNoteRaw).pitch === "string" &&
      typeof (item as SuggestedNoteRaw).startBeat === "number" &&
      typeof (item as SuggestedNoteRaw).durationBeats === "number",
  );
}

const VALID_PITCHES = new Set<string>([
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
]);

/** Convert beat-based suggested notes to tick-based Notes. Returns null for invalid pitches. */
export function suggestedNotesToNotes(
  suggestions: SuggestedNoteRaw[],
  trackId: string,
  idPrefix: string,
): Array<Omit<Note, "id"> & { id: string }> {
  return suggestions.flatMap((s, i) => {
    // Validate pitch format (e.g. "C4", "F#3")
    const match = s.pitch.match(/^([A-G]#?)(\d)$/);
    if (!match) return [];
    const noteName = match[1];
    if (!VALID_PITCHES.has(noteName)) return [];

    const startTick = Math.max(0, Math.round(s.startBeat * PPQ));
    const durationTicks = Math.max(PPQ / 8, Math.round(s.durationBeats * PPQ));

    return [{
      id: `${idPrefix}-${i}`,
      trackId,
      pitch: s.pitch as Pitch,
      startTick,
      durationTicks,
      velocity: typeof s.velocity === "number" ? Math.max(1, Math.min(127, s.velocity)) : 80,
    }];
  });
}

/** Describe existing notes as a compact string for the LLM context. */
function summariseNotes(notes: Note[]): string {
  if (notes.length === 0) return "None yet.";
  const sorted = [...notes].sort((a, b) => a.startTick - b.startTick);
  return sorted
    .slice(0, 40) // cap at 40 to stay within prompt budget
    .map((n) => {
      const beatStart = +(n.startTick / PPQ).toFixed(2);
      const beatDur = +(n.durationTicks / PPQ).toFixed(2);
      return `${n.pitch}@beat${beatStart}(dur:${beatDur})`;
    })
    .join(", ");
}

/** Find the largest silent gap in the roll (returns beats). */
function findPrimaryGap(notes: Note[], totalBars: number): { startBeat: number; endBeat: number } {
  const totalBeats = totalBars * 4;
  if (notes.length === 0) return { startBeat: 0, endBeat: totalBeats };

  const sorted = [...notes].sort((a, b) => a.startTick - b.startTick);
  let largest = { start: 0, end: 0 };
  let prev = 0;

  for (const n of sorted) {
    const s = n.startTick / PPQ;
    if (s - prev > largest.end - largest.start) {
      largest = { start: prev, end: s };
    }
    prev = Math.max(prev, (n.startTick + n.durationTicks) / PPQ);
  }
  // check gap after last note
  if (totalBeats - prev > largest.end - largest.start) {
    largest = { start: prev, end: totalBeats };
  }

  return { startBeat: +largest.start.toFixed(2), endBeat: +largest.end.toFixed(2) };
}

export function buildGapFillSystemPrompt(): string {
  return `You are a MIDI melody composer integrated into a DAW piano roll.
Your only job is to suggest melodic notes that fill silent gaps in an existing melody.
You MUST respond with valid JSON only — no explanation, no markdown, no extra text.
The JSON must be an array of note objects, each with:
  - "pitch": string like "C4", "F#3", "Bb4" (use sharps not flats internally: C#, D#, F#, G#, A#)
  - "startBeat": number (beat position, 1 beat = 1 quarter note at the given BPM)
  - "durationBeats": number (e.g. 0.5 = eighth note, 1 = quarter, 2 = half)
  - "velocity": number 1–127 (optional, default 80)

Rules:
- Suggest 3–8 notes maximum
- Stay in the key signature provided
- Notes must fall within the specified gap range
- Match the rhythmic density and style of surrounding notes
- Do not duplicate existing notes at the same pitch and beat`;
}

export function buildGapFillUserMessage(ctx: GapFillContext): string {
  const gap = findPrimaryGap(ctx.notes, ctx.totalBars);
  return `Context:
- Key: ${ctx.keySignature ?? "C major"}
- Time signature: ${ctx.timeSignature ?? "4/4"}
- BPM: ${ctx.bpm ?? 120}
- Total bars: ${ctx.totalBars}
- Existing notes: ${summariseNotes(ctx.notes)}
- Largest silent gap: beat ${gap.startBeat} to beat ${gap.endBeat}

Fill the gap from beat ${gap.startBeat} to beat ${gap.endBeat} with melodic notes that complement the existing melody. Return JSON array only.`;
}
