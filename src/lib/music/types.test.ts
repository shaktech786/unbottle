import { describe, it, expect } from "vitest";
import { barsToTicks, ticksToSeconds, chordToString, PPQ } from "./types";

describe("barsToTicks", () => {
  it("converts 1 bar in 4/4 to 1920 ticks", () => {
    expect(barsToTicks(1, "4/4")).toBe(4 * PPQ);
  });

  it("converts 4 bars in 4/4 to 7680 ticks", () => {
    expect(barsToTicks(4, "4/4")).toBe(16 * PPQ);
  });

  it("converts 1 bar in 3/4 to 1440 ticks", () => {
    expect(barsToTicks(1, "3/4")).toBe(3 * PPQ);
  });

  it("converts 0 bars to 0 ticks", () => {
    expect(barsToTicks(0)).toBe(0);
  });
});

describe("ticksToSeconds", () => {
  it("converts one quarter note at 120 BPM to 0.5 seconds", () => {
    expect(ticksToSeconds(PPQ, 120)).toBe(0.5);
  });

  it("converts one quarter note at 60 BPM to 1 second", () => {
    expect(ticksToSeconds(PPQ, 60)).toBe(1);
  });

  it("converts 0 ticks to 0 seconds", () => {
    expect(ticksToSeconds(0, 120)).toBe(0);
  });
});

describe("chordToString", () => {
  it("formats major chord", () => {
    expect(chordToString({ root: "C", quality: "major" })).toBe("C");
  });

  it("formats minor chord", () => {
    expect(chordToString({ root: "A", quality: "minor" })).toBe("Am");
  });

  it("formats dominant 7th", () => {
    expect(chordToString({ root: "G", quality: "dominant7" })).toBe("G7");
  });

  it("formats slash chord", () => {
    expect(chordToString({ root: "C", quality: "major", bass: "E" })).toBe("C/E");
  });

  it("formats power chord", () => {
    expect(chordToString({ root: "E", quality: "power" })).toBe("E5");
  });
});
