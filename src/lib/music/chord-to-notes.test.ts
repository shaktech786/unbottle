import { describe, it, expect } from "vitest";
import { chordProgressionToNotes, totalSectionsTicks, totalSectionsBars } from "./chord-to-notes";
import { PPQ } from "./types";
import type { Section } from "./types";

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: "sec-1",
    sessionId: "sess-1",
    name: "Verse",
    type: "verse",
    startBar: 0,
    lengthBars: 4,
    chordProgression: [],
    sortOrder: 0,
    color: "#8b5cf6",
    ...overrides,
  };
}

describe("chordProgressionToNotes", () => {
  it("returns empty array for sections with no chords", () => {
    const sections = [makeSection()];
    const notes = chordProgressionToNotes(sections, "t1", 120);
    expect(notes).toEqual([]);
  });

  it("generates 3 notes per major triad chord", () => {
    const sections = [
      makeSection({
        chordProgression: [
          { chord: { root: "C", quality: "major" }, durationBars: 2 },
        ],
      }),
    ];
    const notes = chordProgressionToNotes(sections, "t1", 120);
    expect(notes).toHaveLength(3); // C, E, G
    expect(notes.every((n) => n.trackId === "t1")).toBe(true);
    expect(notes.every((n) => n.startTick === 0)).toBe(true);
    expect(notes.every((n) => n.durationTicks === 2 * 4 * PPQ)).toBe(true);
  });

  it("generates 4 notes per 7th chord", () => {
    const sections = [
      makeSection({
        chordProgression: [
          { chord: { root: "G", quality: "dominant7" }, durationBars: 1 },
        ],
      }),
    ];
    const notes = chordProgressionToNotes(sections, "t1", 120);
    expect(notes).toHaveLength(4); // G, B, D, F
  });

  it("positions chords sequentially within a section", () => {
    const sections = [
      makeSection({
        chordProgression: [
          { chord: { root: "C", quality: "major" }, durationBars: 2 },
          { chord: { root: "G", quality: "major" }, durationBars: 2 },
        ],
      }),
    ];
    const notes = chordProgressionToNotes(sections, "t1", 120);
    // First chord at tick 0, second at 2 bars * 4 beats * PPQ
    const firstChordNotes = notes.filter((n) => n.startTick === 0);
    const secondChordNotes = notes.filter((n) => n.startTick === 2 * 4 * PPQ);
    expect(firstChordNotes).toHaveLength(3);
    expect(secondChordNotes).toHaveLength(3);
  });

  it("offsets sections by their startBar", () => {
    const sections = [
      makeSection({
        startBar: 4,
        chordProgression: [
          { chord: { root: "A", quality: "minor" }, durationBars: 1 },
        ],
      }),
    ];
    const notes = chordProgressionToNotes(sections, "t1", 120);
    expect(notes[0].startTick).toBe(4 * 4 * PPQ);
  });
});

describe("totalSectionsTicks", () => {
  it("returns 0 for empty sections", () => {
    expect(totalSectionsTicks([])).toBe(0);
  });

  it("calculates total ticks from section spans", () => {
    const sections = [
      makeSection({ startBar: 0, lengthBars: 4 }),
      makeSection({ id: "sec-2", startBar: 4, lengthBars: 8 }),
    ];
    expect(totalSectionsTicks(sections)).toBe(12 * 4 * PPQ);
  });
});

describe("totalSectionsBars", () => {
  it("returns 0 for empty sections", () => {
    expect(totalSectionsBars([])).toBe(0);
  });

  it("returns correct bar count", () => {
    const sections = [
      makeSection({ startBar: 0, lengthBars: 4 }),
      makeSection({ id: "sec-2", startBar: 4, lengthBars: 8 }),
    ];
    expect(totalSectionsBars(sections)).toBe(12);
  });
});
