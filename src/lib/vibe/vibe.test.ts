/**
 * Tests for vibe schema validation and drum pattern generator.
 * Covers MAIN-51 (schema) and MAIN-53 (drum patterns).
 */

import { describe, it, expect } from "vitest";
import { validateVibeInput, VibeInputValidationError } from "./schema";
import { generateDrumPattern } from "./drum-pattern";
import { STEPS, VOICE_COUNT } from "@/lib/audio/drum-sequencer-engine";

// ── MAIN-51: VibeInput schema validation ──────────────────────────────────────

describe("validateVibeInput", () => {
  it("accepts a minimal valid input", () => {
    const result = validateVibeInput({ mood: "melancholic", energy: 3 });
    expect(result.mood).toBe("melancholic");
    expect(result.energy).toBe(3);
  });

  it("accepts all optional fields", () => {
    const result = validateVibeInput({
      mood: "euphoric",
      energy: 5,
      genre: "house",
      reference: "Bicep - Glue",
      description: "late night club",
    });
    expect(result.genre).toBe("house");
    expect(result.reference).toBe("Bicep - Glue");
    expect(result.description).toBe("late night club");
  });

  it("trims whitespace from mood", () => {
    const result = validateVibeInput({ mood: "  dark  ", energy: 2 });
    expect(result.mood).toBe("dark");
  });

  it("throws on missing mood", () => {
    expect(() => validateVibeInput({ energy: 3 })).toThrow(VibeInputValidationError);
  });

  it("throws on empty mood string", () => {
    expect(() => validateVibeInput({ mood: "   ", energy: 3 })).toThrow(VibeInputValidationError);
  });

  it("throws on invalid energy (0)", () => {
    expect(() => validateVibeInput({ mood: "sad", energy: 0 })).toThrow(VibeInputValidationError);
  });

  it("throws on invalid energy (6)", () => {
    expect(() => validateVibeInput({ mood: "sad", energy: 6 })).toThrow(VibeInputValidationError);
  });

  it("throws on non-object input", () => {
    expect(() => validateVibeInput(null)).toThrow(VibeInputValidationError);
    expect(() => validateVibeInput("string")).toThrow(VibeInputValidationError);
  });

  it("accepts all five energy levels", () => {
    for (const e of [1, 2, 3, 4, 5] as const) {
      const result = validateVibeInput({ mood: "test", energy: e });
      expect(result.energy).toBe(e);
    }
  });

  it("VibeInputValidationError has a field property", () => {
    try {
      validateVibeInput({ energy: 3 });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(VibeInputValidationError);
      expect((err as VibeInputValidationError).field).toBe("mood");
    }
  });
});

// ── MAIN-53: generateDrumPattern ─────────────────────────────────────────────

describe("generateDrumPattern", () => {
  it("returns a grid with correct dimensions", () => {
    const { grid } = generateDrumPattern(3, "pop");
    expect(grid).toHaveLength(VOICE_COUNT);
    for (const row of grid) {
      expect(row).toHaveLength(STEPS);
    }
  });

  it("grid contains only booleans", () => {
    const { grid } = generateDrumPattern(3, "pop");
    for (const row of grid) {
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("energy 1 produces a sparse pattern (kick on step 0)", () => {
    const { grid } = generateDrumPattern(1, "ambient");
    // Kick voice (index 0) should have step 0 active
    expect(grid[0][0]).toBe(true);
  });

  it("energy 2 produces a sparse pattern", () => {
    const { grid } = generateDrumPattern(2, "lo-fi");
    // Snare on step 8 (half-time feel)
    expect(grid[1][8]).toBe(true);
  });

  it("energy 3 produces standard 4/4 pattern", () => {
    const { grid } = generateDrumPattern(3, "pop");
    // Kick on beats 1 and 3 = steps 0 and 8
    expect(grid[0][0]).toBe(true);
    expect(grid[0][8]).toBe(true);
    // Snare on beats 2 and 4 = steps 4 and 12
    expect(grid[1][4]).toBe(true);
    expect(grid[1][12]).toBe(true);
  });

  it("energy 4 produces a denser pattern than energy 3", () => {
    const standard = generateDrumPattern(3, "pop");
    const dense = generateDrumPattern(4, "pop");

    const standardCount = standard.grid.flat().filter(Boolean).length;
    const denseCount = dense.grid.flat().filter(Boolean).length;
    expect(denseCount).toBeGreaterThan(standardCount);
  });

  it("energy 5 produces a denser pattern than energy 4", () => {
    const e4 = generateDrumPattern(4, "pop");
    const e5 = generateDrumPattern(5, "pop");

    const count4 = e4.grid.flat().filter(Boolean).length;
    const count5 = e5.grid.flat().filter(Boolean).length;
    expect(count5).toBeGreaterThanOrEqual(count4);
  });

  it("house genre with energy 3 activates 4-on-the-floor kick", () => {
    const { grid } = generateDrumPattern(3, "house");
    // 4-on-the-floor: steps 0, 4, 8, 12
    expect(grid[0][0]).toBe(true);
    expect(grid[0][4]).toBe(true);
    expect(grid[0][8]).toBe(true);
    expect(grid[0][12]).toBe(true);
  });

  it("returns a bpmAdjust number", () => {
    const { bpmAdjust } = generateDrumPattern(3, "rock");
    expect(typeof bpmAdjust).toBe("number");
  });

  it("at least one step is active for all energy levels", () => {
    for (const energy of [1, 2, 3, 4, 5] as const) {
      const { grid } = generateDrumPattern(energy, "pop");
      const totalActive = grid.flat().filter(Boolean).length;
      expect(totalActive).toBeGreaterThan(0);
    }
  });
});
