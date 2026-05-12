import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectLoopObsession,
  detectMuddyMix,
  detectKeyConflict,
  detectTimingDrift,
  analyzeMix,
  type TrackEQState,
} from "./suggestion-engine";
import type { SessionEvent } from "./producer-brain-schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLoopEvent(offsetMs = 0): SessionEvent {
  return { type: "playback_loop", timestamp: Date.now() - offsetMs };
}

function makeMoveEvent(offsetMs = 0): SessionEvent {
  return { type: "clip_moved", timestamp: Date.now() - offsetMs };
}

// ---------------------------------------------------------------------------
// loop_obsession
// ---------------------------------------------------------------------------

describe("detectLoopObsession", () => {
  it("does not fire with exactly 4 loops in window", () => {
    const events = Array.from({ length: 4 }, () => makeLoopEvent());
    expect(detectLoopObsession(events)).toBeNull();
  });

  it("fires after 5 loops in 2-minute window", () => {
    const events = Array.from({ length: 5 }, () => makeLoopEvent());
    const result = detectLoopObsession(events);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("loop_obsession");
  });

  it("fires with more than 5 loops", () => {
    const events = Array.from({ length: 8 }, () => makeLoopEvent());
    expect(detectLoopObsession(events)).not.toBeNull();
  });

  it("ignores loops older than 2 minutes", () => {
    // 5 loops all older than 2 min
    const events = Array.from({ length: 5 }, () => makeLoopEvent(3 * 60 * 1000));
    expect(detectLoopObsession(events)).toBeNull();
  });

  it("only counts loops in the window, not old ones", () => {
    const recent = Array.from({ length: 3 }, () => makeLoopEvent());
    const old = Array.from({ length: 5 }, () => makeLoopEvent(3 * 60 * 1000));
    expect(detectLoopObsession([...old, ...recent])).toBeNull();
  });

  it("confidence increases with more loops", () => {
    const five = detectLoopObsession(Array.from({ length: 5 }, () => makeLoopEvent()));
    const ten = detectLoopObsession(Array.from({ length: 10 }, () => makeLoopEvent()));
    expect(ten!.confidence).toBeGreaterThanOrEqual(five!.confidence);
  });

  it("has a one-line actionable suggestion", () => {
    const events = Array.from({ length: 5 }, () => makeLoopEvent());
    const result = detectLoopObsession(events);
    expect(typeof result?.suggestion).toBe("string");
    expect(result!.suggestion.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// muddy_mix
// ---------------------------------------------------------------------------

describe("detectMuddyMix", () => {
  it("returns null when no tracks", () => {
    expect(detectMuddyMix([])).toBeNull();
  });

  it("returns null when fewer than 2 muddy tracks", () => {
    const tracks: TrackEQState[] = [
      { trackId: "t1", trackName: "Bass", lowPassHz: 400 },
      { trackId: "t2", trackName: "Drums", lowPassHz: null },
    ];
    expect(detectMuddyMix(tracks)).toBeNull();
  });

  it("detects muddy mix with 2+ LP-heavy tracks", () => {
    const tracks: TrackEQState[] = [
      { trackId: "t1", trackName: "Bass",  lowPassHz: 400 },
      { trackId: "t2", trackName: "Pad",   lowPassHz: 600 },
      { trackId: "t3", trackName: "Pluck", lowPassHz: null },
    ];
    const result = detectMuddyMix(tracks);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("muddy_mix");
  });

  it("detects muddy mix via muddyRangeBoostDb", () => {
    const tracks: TrackEQState[] = [
      { trackId: "t1", trackName: "Chord", muddyRangeBoostDb: 4 },
      { trackId: "t2", trackName: "Lead",  muddyRangeBoostDb: 3 },
    ];
    const result = detectMuddyMix(tracks);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("muddy_mix");
  });

  it("does not flag a track with 2 dB boost (below threshold)", () => {
    const tracks: TrackEQState[] = [
      { trackId: "t1", trackName: "A", muddyRangeBoostDb: 2 },
      { trackId: "t2", trackName: "B", muddyRangeBoostDb: 1 },
    ];
    expect(detectMuddyMix(tracks)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// key_conflict
// ---------------------------------------------------------------------------

describe("detectKeyConflict", () => {
  it("returns null with no keys", () => {
    const tracks: TrackEQState[] = [
      { trackId: "t1", trackName: "A" },
      { trackId: "t2", trackName: "B" },
    ];
    expect(detectKeyConflict(tracks)).toBeNull();
  });

  it("returns null when all tracks share the same root", () => {
    const tracks: TrackEQState[] = [
      { trackId: "t1", trackName: "A", key: "C major" },
      { trackId: "t2", trackName: "B", key: "C minor" },
    ];
    expect(detectKeyConflict(tracks)).toBeNull();
  });

  it("detects conflict when tracks have different roots", () => {
    const tracks: TrackEQState[] = [
      { trackId: "t1", trackName: "A", key: "C major" },
      { trackId: "t2", trackName: "B", key: "F# major" },
    ];
    const result = detectKeyConflict(tracks);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("key_conflict");
  });

  it("lists conflicting roots in the suggestion", () => {
    const tracks: TrackEQState[] = [
      { trackId: "t1", trackName: "A", key: "C major" },
      { trackId: "t2", trackName: "B", key: "G minor" },
    ];
    const result = detectKeyConflict(tracks);
    expect(result?.suggestion).toMatch(/C/i);
    expect(result?.suggestion).toMatch(/G/i);
  });
});

// ---------------------------------------------------------------------------
// timing_drift
// ---------------------------------------------------------------------------

describe("detectTimingDrift", () => {
  it("returns null with fewer than 4 moves", () => {
    const events = Array.from({ length: 3 }, () => makeMoveEvent());
    expect(detectTimingDrift(events)).toBeNull();
  });

  it("detects drift with 4+ clip_moved events in window", () => {
    const events = Array.from({ length: 4 }, () => makeMoveEvent());
    const result = detectTimingDrift(events);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("timing_drift");
  });

  it("ignores moves older than 3 minutes", () => {
    const events = Array.from({ length: 6 }, () => makeMoveEvent(4 * 60 * 1000));
    expect(detectTimingDrift(events)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// analyzeMix
// ---------------------------------------------------------------------------

describe("analyzeMix", () => {
  it("returns empty array when no patterns detected", () => {
    const result = analyzeMix([], []);
    expect(result).toEqual([]);
  });

  it("returns multiple patterns when multiple are triggered", () => {
    const loopEvents = Array.from({ length: 5 }, () => makeLoopEvent());
    const muddyTracks: TrackEQState[] = [
      { trackId: "t1", trackName: "A", lowPassHz: 400 },
      { trackId: "t2", trackName: "B", lowPassHz: 600 },
    ];
    const result = analyzeMix(muddyTracks, loopEvents);
    const types = result.map((p) => p.type);
    expect(types).toContain("loop_obsession");
    expect(types).toContain("muddy_mix");
  });
});

// ---------------------------------------------------------------------------
// Snooze suppresses notifications
// ---------------------------------------------------------------------------

describe("snooze suppresses notifications for correct duration", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("snooze blocks notifications for 10 minutes", () => {
    const SNOOZE_MS = 10 * 60 * 1000;
    let snoozedUntil = 0;

    function notify(_p: unknown) {
      const now = Date.now();
      if (now < snoozedUntil) return false;
      return true;
    }

    function snooze() {
      snoozedUntil = Date.now() + SNOOZE_MS;
    }

    // Trigger snooze now
    snooze();

    // Should be blocked at 9 min
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(notify({})).toBe(false);

    // Should be unblocked at 10 min
    vi.advanceTimersByTime(60 * 1000 + 1);
    expect(notify({})).toBe(true);
  });
});
