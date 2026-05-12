/**
 * AI Producer Brain — Suggestion Engine
 *
 * Detects patterns from session events and mixer/track state.
 * Returns EventPattern[] with confidence scores and one-line suggestions.
 */

import type { SessionEvent, EventPattern } from "./producer-brain-schema";

// ---------------------------------------------------------------------------
// Types for mixer/track state (minimal interface)
// ---------------------------------------------------------------------------

export interface TrackEQState {
  trackId: string;
  trackName: string;
  /** Low-pass cutoff frequency in Hz. null = no low-pass filter. */
  lowPassHz?: number | null;
  /** Amount of boost in the 200–400 Hz range, in dB. */
  muddyRangeBoostDb?: number;
  /** Musical key detected for this track's clips (e.g. "C major", "A minor") */
  key?: string | null;
}

export interface MixerState {
  tracks: TrackEQState[];
}

// ---------------------------------------------------------------------------
// Pattern: loop_obsession
// ---------------------------------------------------------------------------

const LOOP_OBSESSION_COUNT = 5;
const LOOP_OBSESSION_WINDOW_MS = 2 * 60 * 1000;

export function detectLoopObsession(events: SessionEvent[]): EventPattern | null {
  const now = Date.now();
  const windowStart = now - LOOP_OBSESSION_WINDOW_MS;

  const loops = events.filter(
    (e) => e.type === "playback_loop" && e.timestamp >= windowStart,
  );

  if (loops.length < LOOP_OBSESSION_COUNT) return null;

  const confidence = Math.min(1, loops.length / 10);
  return {
    type: "loop_obsession",
    confidence,
    suggestion: "You've looped this section 5+ times — try muting one element to hear what's pulling you back.",
    detectedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Pattern: muddy_mix
// ---------------------------------------------------------------------------

const MUDDY_MIX_TRACK_THRESHOLD = 2;
const MUDDY_RANGE_LOW = 200;
const MUDDY_RANGE_HIGH = 400;
const MUDDY_LP_THRESHOLD_HZ = 800; // LP filter below this = potentially muddy

export function detectMuddyMix(tracks: TrackEQState[]): EventPattern | null {
  if (!tracks.length) return null;

  const muddyTracks = tracks.filter((t) => {
    // Low-pass heavy: LP cutoff below 800 Hz cuts the highs, leaving mud
    const hasHeavyLP = t.lowPassHz != null && t.lowPassHz < MUDDY_LP_THRESHOLD_HZ;
    // Explicit boost in 200–400 Hz
    const hasMuddyBoost = (t.muddyRangeBoostDb ?? 0) > 2;
    return hasHeavyLP || hasMuddyBoost;
  });

  if (muddyTracks.length < MUDDY_MIX_TRACK_THRESHOLD) return null;

  const confidence = Math.min(1, muddyTracks.length / tracks.length);
  return {
    type: "muddy_mix",
    confidence,
    suggestion: `${muddyTracks.length} tracks are competing in the ${MUDDY_RANGE_LOW}–${MUDDY_RANGE_HIGH} Hz range — high-pass the non-bass tracks at 80–120 Hz.`,
    detectedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Pattern: key_conflict
// ---------------------------------------------------------------------------

export function detectKeyConflict(tracks: TrackEQState[]): EventPattern | null {
  const keys = tracks
    .map((t) => t.key)
    .filter((k): k is string => Boolean(k));

  if (keys.length < 2) return null;

  // Normalise to just the root (e.g. "C major" → "C", "A minor" → "A")
  const roots = keys.map((k) => k.split(" ")[0].toUpperCase());
  const uniqueRoots = new Set(roots);

  if (uniqueRoots.size <= 1) return null;

  const confidence = Math.min(1, (uniqueRoots.size - 1) / 3);
  return {
    type: "key_conflict",
    confidence,
    suggestion: `Clips in different keys detected (${[...uniqueRoots].join(", ")}) — transpose or quantise to a shared root.`,
    detectedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Pattern: timing_drift
// (Heuristic: many recent clip_moved events with small adjustments = nudging timing)
// ---------------------------------------------------------------------------

const TIMING_DRIFT_MOVE_COUNT = 4;
const TIMING_DRIFT_WINDOW_MS = 3 * 60 * 1000;

export function detectTimingDrift(events: SessionEvent[]): EventPattern | null {
  const now = Date.now();
  const windowStart = now - TIMING_DRIFT_WINDOW_MS;

  const moves = events.filter(
    (e) => e.type === "clip_moved" && e.timestamp >= windowStart,
  );

  if (moves.length < TIMING_DRIFT_MOVE_COUNT) return null;

  const confidence = Math.min(1, moves.length / 10);
  return {
    type: "timing_drift",
    confidence,
    suggestion: "Lots of clip nudges detected — enable grid snap to lock things in, or quantise the offending clips.",
    detectedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export function analyzeMix(
  tracks: TrackEQState[],
  events: SessionEvent[],
): EventPattern[] {
  const patterns: EventPattern[] = [];

  const loopObsession = detectLoopObsession(events);
  if (loopObsession) patterns.push(loopObsession);

  const muddy = detectMuddyMix(tracks);
  if (muddy) patterns.push(muddy);

  const keyConflict = detectKeyConflict(tracks);
  if (keyConflict) patterns.push(keyConflict);

  const timingDrift = detectTimingDrift(events);
  if (timingDrift) patterns.push(timingDrift);

  return patterns;
}
