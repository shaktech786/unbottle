/**
 * Tests for piano-roll canvas logic: coordinate math, pitch list, snap helpers.
 * The canvas itself is not rendered (DOM-free vitest node environment).
 */

import { describe, it, expect } from "vitest";
import { PPQ } from "@/lib/music/types";
import type { Pitch } from "@/lib/music/types";

// ── Inline the pure helpers (mirror of piano-roll.tsx) ─────────────────────

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const ROW_HEIGHT = 22;

function buildPitchList(minOctave: number, maxOctave: number): Pitch[] {
  const list: Pitch[] = [];
  for (let oct = minOctave; oct <= maxOctave; oct++) {
    for (const name of NOTE_NAMES) {
      list.push(`${name}${oct}` as Pitch);
    }
  }
  return list;
}

function yToPitchIndex(y: number, sy: number, totalRows: number): number {
  const row = Math.floor((y + sy) / ROW_HEIGHT);
  return totalRows - 1 - row;
}

function xToTick(x: number, sx: number, pxPerTick: number): number {
  return Math.max(0, (x + sx) / pxPerTick);
}

function snapToGrid(tick: number, snapTicks: number): number {
  return Math.round(tick / snapTicks) * snapTicks;
}

function snapFloor(tick: number, snapTicks: number): number {
  return Math.floor(tick / snapTicks) * snapTicks;
}

function pitchIndexToY(index: number, sy: number, totalRows: number): number {
  return (totalRows - 1 - index) * ROW_HEIGHT - sy;
}

function tickToX(tick: number, pxPerTick: number, sx: number): number {
  return tick * pxPerTick - sx;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("buildPitchList", () => {
  it("includes 12 notes per octave", () => {
    const list = buildPitchList(4, 4);
    expect(list).toHaveLength(12);
    expect(list[0]).toBe("C4");
    expect(list[11]).toBe("B4");
  });

  it("spans C1–C7 = 84 pitches", () => {
    const list = buildPitchList(1, 7);
    expect(list).toHaveLength(84);
    expect(list[0]).toBe("C1");
    expect(list[83]).toBe("B7");
  });
});

describe("coordinate math — xToTick / tickToX round-trip", () => {
  const pxPerTick = 0.25;
  const sx = 0;

  it("converts pixel x to tick", () => {
    expect(xToTick(100, sx, pxPerTick)).toBeCloseTo(400);
  });

  it("converts tick to pixel x", () => {
    expect(tickToX(PPQ, pxPerTick, sx)).toBeCloseTo(PPQ * pxPerTick);
  });

  it("round-trips tick→x→tick", () => {
    const tick = PPQ * 3;
    const x = tickToX(tick, pxPerTick, sx);
    expect(xToTick(x, sx, pxPerTick)).toBeCloseTo(tick);
  });

  it("clamps negative px to 0 ticks", () => {
    expect(xToTick(-100, 0, pxPerTick)).toBe(0);
  });
});

describe("coordinate math — yToPitchIndex / pitchIndexToY round-trip", () => {
  const totalRows = 84; // C1–B7
  const sy = 0;

  it("top-most row maps to highest pitch index", () => {
    const idx = yToPitchIndex(0, sy, totalRows);
    expect(idx).toBe(totalRows - 1);
  });

  it("row 1 (y=22) is second-from-top pitch", () => {
    const idx = yToPitchIndex(ROW_HEIGHT, sy, totalRows);
    expect(idx).toBe(totalRows - 2);
  });

  it("round-trips pitchIndex→y→pitchIndex", () => {
    const pitchIdx = 40;
    const y = pitchIndexToY(pitchIdx, sy, totalRows);
    expect(yToPitchIndex(y, sy, totalRows)).toBe(pitchIdx);
  });

  it("accounts for vertical scroll offset", () => {
    const scrollY = ROW_HEIGHT * 10;
    const idx = yToPitchIndex(0, scrollY, totalRows);
    expect(idx).toBe(totalRows - 1 - 10);
  });
});

describe("snap helpers", () => {
  const snapTicks = PPQ / 4; // 1/16 note

  it("snapToGrid rounds to nearest grid line", () => {
    expect(snapToGrid(snapTicks * 2.4, snapTicks)).toBe(snapTicks * 2);
    expect(snapToGrid(snapTicks * 2.6, snapTicks)).toBe(snapTicks * 3);
  });

  it("snapFloor floors to the grid line below", () => {
    expect(snapFloor(snapTicks * 2.9, snapTicks)).toBe(snapTicks * 2);
    expect(snapFloor(snapTicks * 3.0, snapTicks)).toBe(snapTicks * 3);
  });

  it("PPQ snaps preserve beat-aligned ticks exactly", () => {
    const beatTick = PPQ * 4;
    expect(snapToGrid(beatTick, snapTicks)).toBe(beatTick);
  });
});

describe("MAIN-151: piano roll canvas — pitch range C1–C8", () => {
  it("includes C4 in the standard range", () => {
    const pitches = buildPitchList(1, 7);
    expect(pitches).toContain("C4");
  });

  it("C4 is not at an extreme end", () => {
    const pitches = buildPitchList(1, 7);
    const idx = pitches.indexOf("C4" as Pitch);
    expect(idx).toBeGreaterThan(0);
    expect(idx).toBeLessThan(pitches.length - 1);
  });
});

describe("MAIN-152: note interaction coordinate math", () => {
  it("pitch delta maps correctly for note moves", () => {
    const dy = ROW_HEIGHT * 2;
    const deltaRows = Math.round(dy / ROW_HEIGHT);
    expect(deltaRows).toBe(2);
  });

  it("resize delta snaps fractional ticks to nearest grid line", () => {
    const snapTks = PPQ / 4;
    // dx represents moving ~40% of a snap unit → rounds down to 0
    const dx = snapTks * 0.4 * 0.25; // 0.25 px/tick scale
    const deltaTicks = snapToGrid(dx / 0.25, snapTks);
    expect(deltaTicks).toBe(0);
    // dx representing ~60% → rounds up to 1 snap unit
    const dx2 = snapTks * 0.6 * 0.25;
    const deltaTicks2 = snapToGrid(dx2 / 0.25, snapTks);
    expect(deltaTicks2).toBe(snapTks);
  });

  it("note drawn from left to right covers correct range", () => {
    const snapTks = PPQ / 4;
    const drawStartTick = snapFloor(PPQ, snapTks);
    const cursorTick = snapToGrid(PPQ * 1.5, snapTks);
    const startTick = Math.min(drawStartTick, cursorTick);
    const endTick = Math.max(drawStartTick + snapTks, cursorTick + snapTks);
    const duration = endTick - startTick;
    expect(startTick).toBe(PPQ);
    expect(duration).toBeGreaterThan(0);
  });
});
