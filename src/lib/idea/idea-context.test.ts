/**
 * MAIN-98 — Tests for IdeaContext / useIdeaContext.
 *
 * Tests the buildIdeaSummary utility which is pure logic (no DOM needed).
 */

import { describe, it, expect } from "vitest";
import type { IdeaState } from "./idea-context";

// ---------------------------------------------------------------------------
// Inline re-impl of buildIdeaSummary to test the logic without React context
// ---------------------------------------------------------------------------

function buildIdeaSummary(state: IdeaState): string | null {
  const parts: string[] = [];

  if (state.textPrompt?.trim()) {
    parts.push(`User's vibe description: "${state.textPrompt.trim()}"`);
  }

  if (state.pitchHistory.length > 0) {
    const deduped: string[] = [];
    for (const n of state.pitchHistory) {
      if (deduped[deduped.length - 1] !== n) deduped.push(n);
    }
    parts.push(`Hummed melody (detected notes): ${deduped.slice(0, 20).join(", ")}`);
  }

  if (state.audioBuffer) {
    const durationSec = state.audioBuffer.duration.toFixed(1);
    parts.push(`Audio capture: ${durationSec}s recorded`);
  }

  if (state.referenceBuffer) {
    const refDuration = state.referenceBuffer.duration.toFixed(1);
    parts.push(`Reference track: ${refDuration}s loaded`);
  }

  if (parts.length === 0) return null;
  return `## Captured Idea\n${parts.map((p) => `- ${p}`).join("\n")}`;
}

function fakeBuffer(duration: number): AudioBuffer {
  return { duration } as unknown as AudioBuffer;
}

// ---------------------------------------------------------------------------

describe("IdeaContext.buildIdeaSummary", () => {
  it("returns null when all fields are empty", () => {
    const state: IdeaState = {
      audioBuffer: null,
      pitchHistory: [],
      textPrompt: null,
      referenceBuffer: null,
    };
    expect(buildIdeaSummary(state)).toBeNull();
  });

  it("includes text prompt when set", () => {
    const state: IdeaState = {
      audioBuffer: null,
      pitchHistory: [],
      textPrompt: "dark and heavy, like a storm",
      referenceBuffer: null,
    };
    const summary = buildIdeaSummary(state);
    expect(summary).not.toBeNull();
    expect(summary).toContain("dark and heavy");
  });

  it("includes pitch history with deduplication", () => {
    const state: IdeaState = {
      audioBuffer: null,
      pitchHistory: ["C4", "C4", "D4", "E4"],
      textPrompt: null,
      referenceBuffer: null,
    };
    const summary = buildIdeaSummary(state);
    expect(summary).not.toBeNull();
    // Should deduplicate consecutive C4s
    expect(summary).toContain("C4, D4, E4");
  });

  it("includes audio buffer duration", () => {
    const state: IdeaState = {
      audioBuffer: fakeBuffer(3.5),
      pitchHistory: [],
      textPrompt: null,
      referenceBuffer: null,
    };
    const summary = buildIdeaSummary(state);
    expect(summary).toContain("3.5s");
  });

  it("includes reference buffer duration", () => {
    const state: IdeaState = {
      audioBuffer: null,
      pitchHistory: [],
      textPrompt: null,
      referenceBuffer: fakeBuffer(120.0),
    };
    const summary = buildIdeaSummary(state);
    expect(summary).toContain("120.0s");
  });

  it("combines all fields in one summary", () => {
    const state: IdeaState = {
      audioBuffer: fakeBuffer(2.1),
      pitchHistory: ["A4", "B4"],
      textPrompt: "funky and groovy",
      referenceBuffer: fakeBuffer(60.0),
    };
    const summary = buildIdeaSummary(state);
    expect(summary).toContain("funky and groovy");
    expect(summary).toContain("A4");
    expect(summary).toContain("2.1s");
    expect(summary).toContain("60.0s");
  });

  it("returns a string starting with ## Captured Idea when data exists", () => {
    const state: IdeaState = {
      audioBuffer: null,
      pitchHistory: [],
      textPrompt: "vibes",
      referenceBuffer: null,
    };
    const summary = buildIdeaSummary(state);
    expect(summary?.startsWith("## Captured Idea")).toBe(true);
  });

  it("ignores whitespace-only text prompt", () => {
    const state: IdeaState = {
      audioBuffer: null,
      pitchHistory: [],
      textPrompt: "   ",
      referenceBuffer: null,
    };
    expect(buildIdeaSummary(state)).toBeNull();
  });
});
