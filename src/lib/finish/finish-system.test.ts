/**
 * MAIN-45: Tests for finish criteria evaluation logic and streak tracking.
 */

import { describe, it, expect } from "vitest";
import { scoreExportReadiness } from "./export-readiness";
import { computeNewStreak } from "./streak";
import { DEFAULT_FINISH_CRITERIA } from "./types";
import type { ExportReadinessContext } from "./export-readiness";
import type { FinishContext } from "./types";
import type { Track } from "@/lib/music/types";
import type { DAWClip } from "@/lib/daw/state";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(
  overrides: Partial<{ bpm: number; keySignature: string; timeSignature: string }> = {},
) {
  return { bpm: 120, keySignature: "C major", timeSignature: "4/4", ...overrides };
}

function makeTrack(
  overrides: Partial<Track> = {},
): Track {
  return {
    id: `track-${Math.random()}`,
    sessionId: "session-1",
    name: "Test Track",
    instrument: "synth",
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    color: "#6366f1",
    sortOrder: 0,
    ...overrides,
  };
}

function makeClip(
  overrides: Partial<DAWClip> = {},
): DAWClip {
  return {
    id: `clip-${Math.random()}`,
    trackId: "track-1",
    name: "My Riff",
    startBar: 1,
    lengthBars: 4,
    color: "#6366f1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// scoreExportReadiness — MAIN-45
// ---------------------------------------------------------------------------

describe("scoreExportReadiness", () => {
  it("returns 100 when all checks pass", () => {
    const ctx: ExportReadinessContext = {
      session: makeSession({ bpm: 140, keySignature: "F minor" }),
      tracks: [makeTrack()],
      clips: [makeClip({ name: "Intro Beat" })],
      masterPeakLevel: 0.8,
    };
    const { score, issues } = scoreExportReadiness(ctx);
    expect(score).toBe(100);
    expect(issues).toHaveLength(0);
  });

  it("detects clipping master (level > 1.0)", () => {
    const ctx: ExportReadinessContext = {
      session: makeSession({ bpm: 140, keySignature: "F minor" }),
      tracks: [makeTrack()],
      clips: [makeClip({ name: "Intro" })],
      masterPeakLevel: 1.2,
    };
    const { issues } = scoreExportReadiness(ctx);
    expect(issues.some((i) => i.toLowerCase().includes("clipping"))).toBe(true);
  });

  it("detects unnamed 'Clip' placeholder", () => {
    const ctx: ExportReadinessContext = {
      session: makeSession({ bpm: 140, keySignature: "F minor" }),
      tracks: [makeTrack()],
      clips: [makeClip({ name: "Clip" })],
      masterPeakLevel: 0.8,
    };
    const { issues } = scoreExportReadiness(ctx);
    expect(issues.some((i) => i.toLowerCase().includes("named"))).toBe(true);
  });

  it("detects default BPM of 120 as an issue", () => {
    const ctx: ExportReadinessContext = {
      session: makeSession({ bpm: 120, keySignature: "F minor" }),
      tracks: [makeTrack()],
      clips: [makeClip({ name: "Main" })],
      masterPeakLevel: 0.8,
    };
    const { issues } = scoreExportReadiness(ctx);
    expect(issues.some((i) => i.toLowerCase().includes("bpm"))).toBe(true);
  });

  it("detects missing key signature", () => {
    const ctx: ExportReadinessContext = {
      session: makeSession({ bpm: 140, keySignature: "" }),
      tracks: [makeTrack()],
      clips: [makeClip({ name: "Main" })],
      masterPeakLevel: 0.8,
    };
    const { issues } = scoreExportReadiness(ctx);
    expect(issues.some((i) => i.toLowerCase().includes("key"))).toBe(true);
  });

  it("detects no tracks", () => {
    const ctx: ExportReadinessContext = {
      session: makeSession({ bpm: 140, keySignature: "F minor" }),
      tracks: [],
      clips: [],
      masterPeakLevel: 0.8,
    };
    const { score, issues } = scoreExportReadiness(ctx);
    expect(score).toBeLessThan(100);
    expect(issues.some((i) => i.toLowerCase().includes("track"))).toBe(true);
  });

  it("returns 0 when all checks fail", () => {
    const ctx: ExportReadinessContext = {
      session: makeSession({ bpm: 120, keySignature: "" }),
      tracks: [],
      clips: [makeClip({ name: "Clip" })],
      masterPeakLevel: 1.5,
    };
    const { score } = scoreExportReadiness(ctx);
    expect(score).toBe(0);
  });

  it("does not penalise missing masterPeakLevel (treat as OK)", () => {
    const ctx: ExportReadinessContext = {
      session: makeSession({ bpm: 140, keySignature: "F minor" }),
      tracks: [makeTrack()],
      clips: [makeClip({ name: "Melody" })],
      // masterPeakLevel omitted
    };
    const { issues } = scoreExportReadiness(ctx);
    expect(issues.every((i) => !i.toLowerCase().includes("clipping"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Finish criteria (DEFAULT_FINISH_CRITERIA) — MAIN-45
// ---------------------------------------------------------------------------

describe("finish criteria — beat session type", () => {
  const criteria = DEFAULT_FINISH_CRITERIA.beat.criteria;

  function check(id: string, ctx: FinishContext): boolean {
    const c = criteria.find((cr) => cr.id === id);
    if (!c) throw new Error(`criterion ${id} not found`);
    return c.check(ctx);
  }

  it("beat-has-drums passes when drums track present", () => {
    const ctx: FinishContext = {
      session: makeSession(),
      tracks: [makeTrack({ instrument: "drums" })],
      clips: [],
    };
    expect(check("beat-has-drums", ctx)).toBe(true);
  });

  it("beat-has-drums fails when no drums track", () => {
    const ctx: FinishContext = {
      session: makeSession(),
      tracks: [makeTrack({ instrument: "synth" })],
      clips: [],
    };
    expect(check("beat-has-drums", ctx)).toBe(false);
  });

  it("beat-has-bass passes for bass_electric", () => {
    const ctx: FinishContext = {
      session: makeSession(),
      tracks: [makeTrack({ instrument: "bass_electric" })],
      clips: [],
    };
    expect(check("beat-has-bass", ctx)).toBe(true);
  });

  it("beat-has-bass passes for bass_synth", () => {
    const ctx: FinishContext = {
      session: makeSession(),
      tracks: [makeTrack({ instrument: "bass_synth" })],
      clips: [],
    };
    expect(check("beat-has-bass", ctx)).toBe(true);
  });

  it("beat-has-melody passes when non-drums/bass track present", () => {
    const ctx: FinishContext = {
      session: makeSession(),
      tracks: [makeTrack({ instrument: "pad" })],
      clips: [],
    };
    expect(check("beat-has-melody", ctx)).toBe(true);
  });

  it("beat-mix-level passes when master not clipping", () => {
    const ctx: FinishContext = {
      session: makeSession(),
      tracks: [],
      clips: [],
      masterPeakLevel: 0.9,
    };
    expect(check("beat-mix-level", ctx)).toBe(true);
  });

  it("beat-mix-level fails when master clipping", () => {
    const ctx: FinishContext = {
      session: makeSession(),
      tracks: [],
      clips: [],
      masterPeakLevel: 1.1,
    };
    expect(check("beat-mix-level", ctx)).toBe(false);
  });

  it("beat-bpm-set fails at default 120", () => {
    const ctx: FinishContext = {
      session: makeSession({ bpm: 120 }),
      tracks: [],
      clips: [],
    };
    expect(check("beat-bpm-set", ctx)).toBe(false);
  });

  it("beat-bpm-set passes at non-default BPM", () => {
    const ctx: FinishContext = {
      session: makeSession({ bpm: 135 }),
      tracks: [],
      clips: [],
    };
    expect(check("beat-bpm-set", ctx)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Streak logic — MAIN-45
// ---------------------------------------------------------------------------

describe("computeNewStreak", () => {
  it("starts streak at 1 on first finish", () => {
    const current = { streak: 0, lastFinishDate: null, totalFinishes: 0 };
    const next = computeNewStreak(current, "2026-05-12");
    expect(next.streak).toBe(1);
    expect(next.lastFinishDate).toBe("2026-05-12");
    expect(next.totalFinishes).toBe(1);
  });

  it("increments streak when finishing on consecutive days", () => {
    const current = { streak: 3, lastFinishDate: "2026-05-11", totalFinishes: 3 };
    const next = computeNewStreak(current, "2026-05-12");
    expect(next.streak).toBe(4);
    expect(next.totalFinishes).toBe(4);
  });

  it("resets streak to 1 when gap > 1 day", () => {
    const current = { streak: 5, lastFinishDate: "2026-05-09", totalFinishes: 5 };
    const next = computeNewStreak(current, "2026-05-12");
    expect(next.streak).toBe(1);
    expect(next.totalFinishes).toBe(6);
  });

  it("is idempotent when finishing the same day", () => {
    const current = { streak: 3, lastFinishDate: "2026-05-12", totalFinishes: 3 };
    const next = computeNewStreak(current, "2026-05-12");
    expect(next).toEqual(current);
  });

  it("resets streak to 1 when there was a gap and then resumes", () => {
    const current = { streak: 10, lastFinishDate: "2026-01-01", totalFinishes: 10 };
    const next = computeNewStreak(current, "2026-05-12");
    expect(next.streak).toBe(1);
  });
});
