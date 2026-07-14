import { describe, it, expect } from "vitest";
import {
  parseSuggestedNotes,
  suggestedNotesToNotes,
  buildGapFillSystemPrompt,
  buildGapFillUserMessage,
  type SuggestedNoteRaw,
} from "./piano-roll-gap-fill";
import { PPQ } from "@/lib/music/types";
import type { Note, Pitch } from "@/lib/music/types";

function makeNote(id: string, startTick: number, durationTicks: number, pitch = "C4"): Note {
  return { id, trackId: "t1", pitch: pitch as Pitch, startTick, durationTicks, velocity: 80 };
}

describe("parseSuggestedNotes", () => {
  it("returns empty array for non-array input", () => {
    expect(parseSuggestedNotes(null)).toEqual([]);
    expect(parseSuggestedNotes("bad")).toEqual([]);
    expect(parseSuggestedNotes({})).toEqual([]);
  });

  it("filters out items missing required fields", () => {
    const raw = [
      { pitch: "C4", startBeat: 1, durationBeats: 0.5 }, // valid
      { pitch: "D4", startBeat: 1 }, // missing durationBeats
      { startBeat: 2, durationBeats: 1 }, // missing pitch
    ];
    const result = parseSuggestedNotes(raw);
    expect(result).toHaveLength(1);
    expect(result[0].pitch).toBe("C4");
  });

  it("accepts optional velocity field", () => {
    const raw = [{ pitch: "E4", startBeat: 0, durationBeats: 1, velocity: 90 }];
    const result = parseSuggestedNotes(raw);
    expect(result[0].velocity).toBe(90);
  });
});

describe("suggestedNotesToNotes", () => {
  it("converts beat-based notes to tick-based notes", () => {
    const raw: SuggestedNoteRaw[] = [
      { pitch: "C4", startBeat: 1, durationBeats: 0.5 },
    ];
    const result = suggestedNotesToNotes(raw, "track-1", "test");
    expect(result).toHaveLength(1);
    expect(result[0].startTick).toBe(PPQ); // beat 1 = PPQ ticks
    expect(result[0].durationTicks).toBe(PPQ / 2); // 0.5 beats
    expect(result[0].trackId).toBe("track-1");
  });

  it("rejects notes with invalid pitch format", () => {
    const raw: SuggestedNoteRaw[] = [
      { pitch: "invalid", startBeat: 0, durationBeats: 1 },
      { pitch: "C4", startBeat: 0, durationBeats: 1 },
    ];
    const result = suggestedNotesToNotes(raw, "t1", "pfx");
    expect(result).toHaveLength(1);
    expect(result[0].pitch).toBe("C4");
  });

  it("clamps velocity to 1–127", () => {
    const raw: SuggestedNoteRaw[] = [
      { pitch: "D4", startBeat: 0, durationBeats: 1, velocity: 200 },
    ];
    const result = suggestedNotesToNotes(raw, "t1", "pfx");
    expect(result[0].velocity).toBe(127);
  });

  it("defaults velocity to 80 when not provided", () => {
    const raw: SuggestedNoteRaw[] = [
      { pitch: "E4", startBeat: 0, durationBeats: 1 },
    ];
    const result = suggestedNotesToNotes(raw, "t1", "pfx");
    expect(result[0].velocity).toBe(80);
  });

  it("ensures minimum duration of PPQ/8", () => {
    const raw: SuggestedNoteRaw[] = [
      { pitch: "F4", startBeat: 0, durationBeats: 0.001 },
    ];
    const result = suggestedNotesToNotes(raw, "t1", "pfx");
    expect(result[0].durationTicks).toBe(PPQ / 8);
  });

  it("clamps negative startBeat to 0", () => {
    const raw: SuggestedNoteRaw[] = [
      { pitch: "G4", startBeat: -2, durationBeats: 1 },
    ];
    const result = suggestedNotesToNotes(raw, "t1", "pfx");
    expect(result[0].startTick).toBe(0);
  });
});

describe("buildGapFillSystemPrompt", () => {
  it("mentions JSON-only response requirement", () => {
    const prompt = buildGapFillSystemPrompt();
    expect(prompt.toLowerCase()).toContain("json");
  });

  it("specifies required fields", () => {
    const prompt = buildGapFillSystemPrompt();
    expect(prompt).toContain("pitch");
    expect(prompt).toContain("startBeat");
    expect(prompt).toContain("durationBeats");
  });
});

describe("buildGapFillUserMessage", () => {
  it("includes key signature and total bars", () => {
    const msg = buildGapFillUserMessage({
      notes: [],
      totalBars: 8,
      keySignature: "G major",
      bpm: 140,
    });
    expect(msg).toContain("G major");
    expect(msg).toContain("8");
    expect(msg).toContain("140");
  });

  it("identifies a gap and includes it in the message", () => {
    const notes: Note[] = [
      makeNote("n1", 0, PPQ * 2), // beats 0–2
      makeNote("n2", PPQ * 6, PPQ * 2), // beats 6–8
    ];
    const msg = buildGapFillUserMessage({ notes, totalBars: 4 });
    // Largest gap: beat 8 to beat 16 (after last note, to end of 4 bars)
    expect(msg).toContain("beat 8");
    expect(msg).toContain("beat 16");
    expect(msg).toContain("Existing notes");
  });

  it("uses full range as gap when no notes exist", () => {
    const msg = buildGapFillUserMessage({ notes: [], totalBars: 4 });
    expect(msg).toContain("beat 0");
    expect(msg).toContain("beat 16"); // 4 bars * 4 beats
  });
});
