import { describe, it, expect } from "vitest";
import {
  calculateEndTick,
  getSectionTickRange,
  copyNotesForSection,
} from "./playback-utils";
import { PPQ } from "@/lib/music/types";
import type { Note, Section } from "@/lib/music/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    trackId: "t1",
    pitch: "C4",
    startTick: 0,
    durationTicks: PPQ, // 1 beat
    velocity: 100,
    ...overrides,
  };
}

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

// ---------------------------------------------------------------------------
// calculateEndTick
// ---------------------------------------------------------------------------

describe("calculateEndTick", () => {
  it("returns 0 for an empty notes array", () => {
    expect(calculateEndTick([])).toBe(0);
  });

  it("returns startTick + durationTicks for a single note", () => {
    const notes = [makeNote({ startTick: 100, durationTicks: 200 })];
    expect(calculateEndTick(notes)).toBe(300);
  });

  it("returns the maximum end tick across multiple notes", () => {
    const notes = [
      makeNote({ id: "n1", startTick: 0, durationTicks: 100 }),
      makeNote({ id: "n2", startTick: 50, durationTicks: 200 }),
      makeNote({ id: "n3", startTick: 300, durationTicks: 10 }),
    ];
    // Ends at: 100, 250, 310 => max is 310
    expect(calculateEndTick(notes)).toBe(310);
  });

  it("handles notes that start at tick 0", () => {
    const notes = [makeNote({ startTick: 0, durationTicks: PPQ * 4 })];
    expect(calculateEndTick(notes)).toBe(PPQ * 4);
  });
});

// ---------------------------------------------------------------------------
// getSectionTickRange
// ---------------------------------------------------------------------------

describe("getSectionTickRange", () => {
  it("returns correct tick range for a section starting at bar 0 in 4/4", () => {
    const section = makeSection({ startBar: 0, lengthBars: 4 });
    const range = getSectionTickRange(section, "4/4");
    expect(range.startTick).toBe(0);
    expect(range.endTick).toBe(4 * 4 * PPQ); // 4 bars * 4 beats * PPQ
  });

  it("returns correct tick range for a section with non-zero startBar", () => {
    const section = makeSection({ startBar: 4, lengthBars: 8 });
    const range = getSectionTickRange(section, "4/4");
    expect(range.startTick).toBe(4 * 4 * PPQ);
    expect(range.endTick).toBe((4 + 8) * 4 * PPQ);
  });

  it("handles 3/4 time signature", () => {
    const section = makeSection({ startBar: 0, lengthBars: 4 });
    const range = getSectionTickRange(section, "3/4");
    expect(range.startTick).toBe(0);
    expect(range.endTick).toBe(4 * 3 * PPQ); // 4 bars * 3 beats * PPQ
  });

  it("handles 6/8 time signature", () => {
    const section = makeSection({ startBar: 2, lengthBars: 2 });
    const range = getSectionTickRange(section, "6/8");
    expect(range.startTick).toBe(2 * 6 * PPQ);
    expect(range.endTick).toBe((2 + 2) * 6 * PPQ);
  });
});

// ---------------------------------------------------------------------------
// copyNotesForSection
// ---------------------------------------------------------------------------

describe("copyNotesForSection", () => {
  it("returns empty array when no notes fall in the source range", () => {
    const notes = [makeNote({ startTick: 5000, durationTicks: 100 })];
    const result = copyNotesForSection(notes, 0, 1000, 2000);
    expect(result).toEqual([]);
  });

  it("filters notes within the source tick range", () => {
    const notes = [
      makeNote({ id: "n1", startTick: 100, durationTicks: 50 }),
      makeNote({ id: "n2", startTick: 500, durationTicks: 50 }),
      makeNote({ id: "n3", startTick: 2000, durationTicks: 50 }), // outside range
    ];
    const result = copyNotesForSection(notes, 0, 1000, 3000);
    expect(result).toHaveLength(2);
  });

  it("offsets notes to the target section start tick", () => {
    const notes = [
      makeNote({ id: "n1", startTick: 100, durationTicks: 50 }),
      makeNote({ id: "n2", startTick: 500, durationTicks: 50 }),
    ];
    // Source range: 0-1000, target start: 2000
    // n1: 100 - 0 + 2000 = 2100
    // n2: 500 - 0 + 2000 = 2500
    const result = copyNotesForSection(notes, 0, 1000, 2000);
    expect(result[0].startTick).toBe(2100);
    expect(result[1].startTick).toBe(2500);
  });

  it("preserves pitch, durationTicks, and velocity", () => {
    const notes = [
      makeNote({ id: "n1", startTick: 100, durationTicks: 200, pitch: "E4", velocity: 80 }),
    ];
    const result = copyNotesForSection(notes, 0, 1000, 2000);
    expect(result[0].pitch).toBe("E4");
    expect(result[0].durationTicks).toBe(200);
    expect(result[0].velocity).toBe(80);
  });

  it("reassigns trackId when newTrackId is provided", () => {
    const notes = [
      makeNote({ id: "n1", trackId: "t1", startTick: 100, durationTicks: 50 }),
    ];
    const result = copyNotesForSection(notes, 0, 1000, 2000, "t2");
    expect(result[0].trackId).toBe("t2");
  });

  it("keeps original trackId when newTrackId is not provided", () => {
    const notes = [
      makeNote({ id: "n1", trackId: "t1", startTick: 100, durationTicks: 50 }),
    ];
    const result = copyNotesForSection(notes, 0, 1000, 2000);
    expect(result[0].trackId).toBe("t1");
  });

  it("does not include id field in returned notes", () => {
    const notes = [
      makeNote({ id: "n1", startTick: 100, durationTicks: 50 }),
    ];
    const result = copyNotesForSection(notes, 0, 1000, 2000);
    expect(result[0]).not.toHaveProperty("id");
  });

  it("handles notes at the exact boundary of the source range", () => {
    const notes = [
      makeNote({ id: "n1", startTick: 0, durationTicks: 50 }), // at start boundary (included)
      makeNote({ id: "n2", startTick: 999, durationTicks: 50 }), // just before end (included)
      makeNote({ id: "n3", startTick: 1000, durationTicks: 50 }), // at end boundary (excluded)
    ];
    const result = copyNotesForSection(notes, 0, 1000, 2000);
    expect(result).toHaveLength(2);
  });
});
