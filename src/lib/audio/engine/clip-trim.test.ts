/**
 * MAIN-158: clip-trim tests — trim handle drag and fraction/tick conversion.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeTrim,
  fractionToTicks,
  ticksToFraction,
  computeTrimFromDrag,
} from "./clip-trim";

describe("normalizeTrim", () => {
  it("returns clamped fractions in [0,1]", () => {
    const { startFraction, endFraction } = normalizeTrim(0.2, 0.8);
    expect(startFraction).toBeCloseTo(0.2);
    expect(endFraction).toBeCloseTo(0.8);
  });

  it("clamps below 0 to 0", () => {
    const { startFraction } = normalizeTrim(-0.5, 0.8);
    expect(startFraction).toBe(0);
  });

  it("clamps above 1 to 1", () => {
    const { endFraction } = normalizeTrim(0.2, 1.5);
    expect(endFraction).toBe(1);
  });

  it("enforces start < end (at least 0.01 gap)", () => {
    const { startFraction, endFraction } = normalizeTrim(0.9, 0.5);
    expect(startFraction).toBeLessThan(endFraction);
  });

  it("handles equal start and end by shifting start back", () => {
    const { startFraction, endFraction } = normalizeTrim(0.5, 0.5);
    expect(startFraction).toBeLessThan(endFraction);
  });
});

describe("fractionToTicks", () => {
  it("converts 0 → 0", () => {
    expect(fractionToTicks(0, 1920)).toBe(0);
  });

  it("converts 1 → durationTicks", () => {
    expect(fractionToTicks(1, 1920)).toBe(1920);
  });

  it("converts 0.5 → half of durationTicks", () => {
    expect(fractionToTicks(0.5, 1920)).toBe(960);
  });

  it("clamps fractions outside [0,1]", () => {
    expect(fractionToTicks(-0.5, 1920)).toBe(0);
    expect(fractionToTicks(2.0, 1920)).toBe(1920);
  });
});

describe("ticksToFraction", () => {
  it("converts 0 ticks → 0", () => {
    expect(ticksToFraction(0, 1920)).toBe(0);
  });

  it("converts durationTicks → 1", () => {
    expect(ticksToFraction(1920, 1920)).toBe(1);
  });

  it("converts half ticks → 0.5", () => {
    expect(ticksToFraction(960, 1920)).toBeCloseTo(0.5);
  });

  it("returns 0 for durationTicks <= 0 (no division by zero)", () => {
    expect(ticksToFraction(100, 0)).toBe(0);
  });

  it("clamps to [0,1]", () => {
    expect(ticksToFraction(9999, 1920)).toBe(1);
    expect(ticksToFraction(-1, 1920)).toBe(0);
  });
});

describe("computeTrimFromDrag", () => {
  it("start handle: drag right increases startFraction", () => {
    const result = computeTrimFromDrag("start", 10, 100, 0.1, 0.9);
    expect(result).toBeCloseTo(0.2);
  });

  it("start handle: drag left decreases startFraction", () => {
    const result = computeTrimFromDrag("start", -10, 100, 0.3, 0.9);
    expect(result).toBeCloseTo(0.2);
  });

  it("start handle: cannot exceed endFraction - 0.01", () => {
    const result = computeTrimFromDrag("start", 100, 100, 0.5, 0.8);
    expect(result).toBeCloseTo(0.79);
  });

  it("start handle: cannot go below 0", () => {
    const result = computeTrimFromDrag("start", -200, 100, 0.05, 0.9);
    expect(result).toBe(0);
  });

  it("end handle: drag left decreases endFraction", () => {
    const result = computeTrimFromDrag("end", -10, 100, 0.9, 0.1);
    expect(result).toBeCloseTo(0.8);
  });

  it("end handle: cannot go below startFraction + 0.01", () => {
    const result = computeTrimFromDrag("end", -200, 100, 0.5, 0.2);
    expect(result).toBeCloseTo(0.21);
  });

  it("end handle: cannot exceed 1", () => {
    const result = computeTrimFromDrag("end", 200, 100, 0.95, 0.1);
    expect(result).toBe(1);
  });

  it("returns currentFraction unchanged when clipWidthPx is 0", () => {
    const result = computeTrimFromDrag("start", 50, 0, 0.5, 0.9);
    expect(result).toBe(0.5);
  });
});
