/**
 * Timeline data model for the DAW Arrangement View (MAIN-166).
 *
 * All time values are in ticks (PPQ = 480). The timeline is a 2D grid:
 *   - X axis: time (ticks)
 *   - Y axis: track lanes (top to bottom, sorted by lane index)
 *
 * Hierarchy:
 *   Timeline
 *     ├── TimelineTrack[]  (lanes: MIDI, audio, or automation)
 *     │     └── TimelineClip[]  (regions of content assigned to a lane)
 *     ├── Marker[]          (named points in time, e.g. verse, chorus)
 *     └── Region[]          (time ranges, e.g. loop region, selection)
 */

// ---------------------------------------------------------------------------
// Clip
// ---------------------------------------------------------------------------

/** Content type determines how the clip is rendered and played back. */
export type ClipType = "midi" | "audio" | "automation";

/** A clip is a rectangular block on the timeline grid. */
export interface TimelineClip {
  /** Unique identifier */
  id: string;
  /** Which track lane this clip belongs to */
  trackId: string;
  /** Display name (optional — defaults to track name) */
  name?: string;
  /** Start position in ticks */
  startTick: number;
  /** Duration in ticks */
  durationTicks: number;
  /** Content type */
  type: ClipType;
  /**
   * For MIDI clips: the id of the MIDI region/note set.
   * For audio clips: the URL or storage key of the audio file.
   * For automation clips: the id of the automation lane data.
   */
  contentRef: string;
  /**
   * Offset into the content where playback begins (content trim start).
   * Defaults to 0. Useful for audio trim handles.
   */
  contentOffsetTicks: number;
  /** Gain multiplier [0, 2]. Default 1. */
  gain: number;
  /** Display colour override (hex). Inherits from track if omitted. */
  color?: string;
  /** Whether the clip is muted (plays silently). */
  muted: boolean;
  /** Whether the clip is selected in the UI. */
  selected: boolean;
}

// ---------------------------------------------------------------------------
// Track lane
// ---------------------------------------------------------------------------

export type TimelineTrackType = "midi" | "audio" | "automation";

/** A horizontal lane in the arrangement view. */
export interface TimelineTrack {
  id: string;
  name: string;
  type: TimelineTrackType;
  /** Index for vertical ordering (0 = top). */
  laneIndex: number;
  /** Height in pixels. Default 80. */
  laneHeight: number;
  /** Hex colour used for clips and the track header accent. */
  color: string;
  muted: boolean;
  solo: boolean;
  /** Whether the track is armed for recording. */
  armed: boolean;
  /** Clips assigned to this track, ordered by startTick. */
  clips: TimelineClip[];
}

// ---------------------------------------------------------------------------
// Marker
// ---------------------------------------------------------------------------

/**
 * A named point in time. Used for section markers (verse, chorus…),
 * cue points, and user annotations.
 */
export interface Marker {
  id: string;
  /** Position in ticks */
  tick: number;
  label: string;
  /** Hex colour. Default "#f59e0b" (amber). */
  color: string;
  /** Optional longer description shown on hover. */
  description?: string;
}

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

export type RegionType =
  | "loop"       // loop playback between start and end
  | "selection"  // user's current drag-select range
  | "punch_in"   // record only inside this range
  | "custom";

/**
 * A named time range spanning from startTick to endTick (exclusive).
 * Regions can overlap.
 */
export interface Region {
  id: string;
  type: RegionType;
  startTick: number;
  /** Must be > startTick. */
  endTick: number;
  label?: string;
  /** Hex colour with optional opacity. */
  color: string;
  /** Whether to show the region in the timeline ruler. */
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Top-level timeline state
// ---------------------------------------------------------------------------

export interface TimelineState {
  /** Project/session BPM */
  bpm: number;
  /** e.g. "4/4" */
  timeSignature: string;
  /** Current playhead position in ticks */
  playheadTick: number;
  /** Timeline horizontal scroll offset in ticks */
  scrollTick: number;
  /** Pixels per tick at the current zoom level */
  pixelsPerTick: number;
  /** All tracks in lane order */
  tracks: TimelineTrack[];
  /** Named time points */
  markers: Marker[];
  /** Named time ranges */
  regions: Region[];
  /** Id of the currently active loop region (if any) */
  activeLoopRegionId: string | null;
}

// ---------------------------------------------------------------------------
// Helper constructors
// ---------------------------------------------------------------------------

/** PPQ (Pulses Per Quarter Note) — matches the core music/types constant. */
export const PPQ_DEFAULT = 480;

export function makeTimelineClip(
  overrides: Partial<TimelineClip> & Pick<TimelineClip, "id" | "trackId" | "startTick" | "durationTicks" | "type" | "contentRef">,
): TimelineClip {
  return {
    name: undefined,
    contentOffsetTicks: 0,
    gain: 1,
    color: undefined,
    muted: false,
    selected: false,
    ...overrides,
  };
}

export function makeTimelineTrack(
  overrides: Partial<TimelineTrack> & Pick<TimelineTrack, "id" | "name" | "type" | "laneIndex">,
): TimelineTrack {
  return {
    laneHeight: 80,
    color: "#6366f1",
    muted: false,
    solo: false,
    armed: false,
    clips: [],
    ...overrides,
  };
}

export function makeMarker(
  overrides: Partial<Marker> & Pick<Marker, "id" | "tick" | "label">,
): Marker {
  return {
    color: "#f59e0b",
    description: undefined,
    ...overrides,
  };
}

export function makeRegion(
  overrides: Partial<Region> & Pick<Region, "id" | "type" | "startTick" | "endTick">,
): Region {
  return {
    label: undefined,
    color: "rgba(99,102,241,0.15)",
    visible: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tick / pixel conversion helpers
// ---------------------------------------------------------------------------

export function ticksToPixels(ticks: number, pixelsPerTick: number): number {
  return ticks * pixelsPerTick;
}

export function pixelsToTicks(pixels: number, pixelsPerTick: number): number {
  return pixels / pixelsPerTick;
}

/**
 * Snap a tick value to the nearest grid subdivision.
 * @param tick            raw tick value
 * @param subdivisionTicks ticks per grid cell (e.g. PPQ/4 for 16th note grid)
 */
export function snapToGrid(tick: number, subdivisionTicks: number): number {
  if (subdivisionTicks <= 0) return tick;
  return Math.round(tick / subdivisionTicks) * subdivisionTicks;
}

/**
 * Calculate the total timeline duration in ticks from all clips across all tracks.
 * Returns at least `minDurationTicks`.
 */
export function calcTimelineDuration(
  tracks: TimelineTrack[],
  minDurationTicks = 0,
): number {
  let max = minDurationTicks;
  for (const track of tracks) {
    for (const clip of track.clips) {
      const end = clip.startTick + clip.durationTicks;
      if (end > max) max = end;
    }
  }
  return max;
}

/**
 * Return clips from all tracks sorted by startTick ascending.
 */
export function flattenClips(tracks: TimelineTrack[]): TimelineClip[] {
  return tracks
    .flatMap((t) => t.clips)
    .sort((a, b) => a.startTick - b.startTick);
}

/**
 * Find clips in the given tick range [startTick, endTick).
 */
export function clipsInRange(
  tracks: TimelineTrack[],
  startTick: number,
  endTick: number,
): TimelineClip[] {
  return flattenClips(tracks).filter(
    (c) => c.startTick < endTick && c.startTick + c.durationTicks > startTick,
  );
}

/**
 * Test whether two clips overlap in time (on the same track).
 */
export function clipsOverlap(a: TimelineClip, b: TimelineClip): boolean {
  if (a.trackId !== b.trackId) return false;
  return a.startTick < b.startTick + b.durationTicks &&
    b.startTick < a.startTick + a.durationTicks;
}
