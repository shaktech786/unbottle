import { describe, it, expect } from "vitest";
import {
  makeTimelineClip,
  makeTimelineTrack,
  makeMarker,
  makeRegion,
  ticksToPixels,
  pixelsToTicks,
  snapToGrid,
  calcTimelineDuration,
  flattenClips,
  clipsInRange,
  clipsOverlap,
  type TimelineClip,
} from "./types";

// ---------------------------------------------------------------------------
// Constructor helpers
// ---------------------------------------------------------------------------

describe("makeTimelineClip", () => {
  it("applies required fields and sensible defaults", () => {
    const clip = makeTimelineClip({
      id: "c1",
      trackId: "t1",
      startTick: 0,
      durationTicks: 960,
      type: "midi",
      contentRef: "ref1",
    });

    expect(clip.id).toBe("c1");
    expect(clip.trackId).toBe("t1");
    expect(clip.gain).toBe(1);
    expect(clip.muted).toBe(false);
    expect(clip.selected).toBe(false);
    expect(clip.contentOffsetTicks).toBe(0);
    expect(clip.color).toBeUndefined();
  });

  it("allows overriding defaults", () => {
    const clip = makeTimelineClip({
      id: "c1",
      trackId: "t1",
      startTick: 480,
      durationTicks: 480,
      type: "audio",
      contentRef: "audio.wav",
      gain: 0.5,
      muted: true,
      color: "#ff0000",
    });

    expect(clip.gain).toBe(0.5);
    expect(clip.muted).toBe(true);
    expect(clip.color).toBe("#ff0000");
  });
});

describe("makeTimelineTrack", () => {
  it("applies required fields and sensible defaults", () => {
    const track = makeTimelineTrack({ id: "t1", name: "Piano", type: "midi", laneIndex: 0 });

    expect(track.laneHeight).toBe(80);
    expect(track.color).toBe("#6366f1");
    expect(track.muted).toBe(false);
    expect(track.solo).toBe(false);
    expect(track.armed).toBe(false);
    expect(track.clips).toEqual([]);
  });
});

describe("makeMarker", () => {
  it("defaults to amber color", () => {
    const m = makeMarker({ id: "m1", tick: 960, label: "Verse" });
    expect(m.color).toBe("#f59e0b");
    expect(m.description).toBeUndefined();
  });
});

describe("makeRegion", () => {
  it("defaults visible = true", () => {
    const r = makeRegion({ id: "r1", type: "loop", startTick: 0, endTick: 1920 });
    expect(r.visible).toBe(true);
    expect(r.label).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tick / pixel conversion
// ---------------------------------------------------------------------------

describe("ticksToPixels / pixelsToTicks", () => {
  it("converts ticks to pixels at given ppt", () => {
    expect(ticksToPixels(480, 0.25)).toBe(120);
    expect(ticksToPixels(0, 0.25)).toBe(0);
  });

  it("round-trips correctly", () => {
    const ppt = 0.1;
    const originalTicks = 1234;
    const px = ticksToPixels(originalTicks, ppt);
    expect(pixelsToTicks(px, ppt)).toBeCloseTo(originalTicks);
  });
});

// ---------------------------------------------------------------------------
// snapToGrid
// ---------------------------------------------------------------------------

describe("snapToGrid", () => {
  const QUARTER = 480;
  const SIXTEENTH = 120;

  it("snaps exactly on grid boundary unchanged", () => {
    expect(snapToGrid(480, QUARTER)).toBe(480);
    expect(snapToGrid(0, SIXTEENTH)).toBe(0);
  });

  it("snaps tick below midpoint down", () => {
    expect(snapToGrid(100, QUARTER)).toBe(0);   // 100 < 240 → round down
    expect(snapToGrid(110, SIXTEENTH)).toBe(120); // 110 > 60 → round up
  });

  it("snaps tick at midpoint up", () => {
    expect(snapToGrid(240, QUARTER)).toBe(480);  // 240 == half → round up
  });

  it("handles 0 subdivision (no snap)", () => {
    expect(snapToGrid(123, 0)).toBe(123);
  });
});

// ---------------------------------------------------------------------------
// calcTimelineDuration
// ---------------------------------------------------------------------------

describe("calcTimelineDuration", () => {
  it("returns 0 for empty timeline", () => {
    expect(calcTimelineDuration([])).toBe(0);
  });

  it("returns max clip end tick across all tracks", () => {
    const t1 = makeTimelineTrack({ id: "t1", name: "A", type: "midi", laneIndex: 0 });
    t1.clips.push(makeTimelineClip({ id: "c1", trackId: "t1", startTick: 0, durationTicks: 960, type: "midi", contentRef: "r1" }));
    const t2 = makeTimelineTrack({ id: "t2", name: "B", type: "audio", laneIndex: 1 });
    t2.clips.push(makeTimelineClip({ id: "c2", trackId: "t2", startTick: 480, durationTicks: 1440, type: "audio", contentRef: "a1" }));

    expect(calcTimelineDuration([t1, t2])).toBe(1920); // 480 + 1440
  });

  it("respects minDurationTicks when clips are shorter", () => {
    const t1 = makeTimelineTrack({ id: "t1", name: "A", type: "midi", laneIndex: 0 });
    t1.clips.push(makeTimelineClip({ id: "c1", trackId: "t1", startTick: 0, durationTicks: 480, type: "midi", contentRef: "r1" }));

    expect(calcTimelineDuration([t1], 9600)).toBe(9600);
  });
});

// ---------------------------------------------------------------------------
// flattenClips
// ---------------------------------------------------------------------------

describe("flattenClips", () => {
  it("returns clips from all tracks sorted by startTick", () => {
    const t1 = makeTimelineTrack({ id: "t1", name: "A", type: "midi", laneIndex: 0 });
    t1.clips.push(
      makeTimelineClip({ id: "c1", trackId: "t1", startTick: 960, durationTicks: 480, type: "midi", contentRef: "r1" }),
      makeTimelineClip({ id: "c2", trackId: "t1", startTick: 0, durationTicks: 480, type: "midi", contentRef: "r2" }),
    );
    const t2 = makeTimelineTrack({ id: "t2", name: "B", type: "audio", laneIndex: 1 });
    t2.clips.push(
      makeTimelineClip({ id: "c3", trackId: "t2", startTick: 480, durationTicks: 480, type: "audio", contentRef: "a1" }),
    );

    const flat = flattenClips([t1, t2]);
    expect(flat.map((c) => c.id)).toEqual(["c2", "c3", "c1"]);
  });

  it("returns empty array for no tracks", () => {
    expect(flattenClips([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// clipsInRange
// ---------------------------------------------------------------------------

describe("clipsInRange", () => {
  function makeClip(id: string, startTick: number, durationTicks: number): TimelineClip {
    return makeTimelineClip({ id, trackId: "t1", startTick, durationTicks, type: "midi", contentRef: "r" });
  }

  it("returns clips that overlap the given range", () => {
    const t1 = makeTimelineTrack({ id: "t1", name: "A", type: "midi", laneIndex: 0 });
    t1.clips.push(
      makeClip("c1", 0, 480),    // ends at 480
      makeClip("c2", 480, 480),  // starts at 480
      makeClip("c3", 1000, 480), // starts at 1000
    );

    const results = clipsInRange([t1], 100, 900);
    const ids = results.map((c) => c.id).sort();
    expect(ids).toEqual(["c1", "c2"]);
  });

  it("returns empty when no clips overlap", () => {
    const t1 = makeTimelineTrack({ id: "t1", name: "A", type: "midi", laneIndex: 0 });
    t1.clips.push(makeClip("c1", 0, 100));

    expect(clipsInRange([t1], 200, 400)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// clipsOverlap
// ---------------------------------------------------------------------------

describe("clipsOverlap", () => {
  function clip(id: string, trackId: string, startTick: number, durationTicks: number): TimelineClip {
    return makeTimelineClip({ id, trackId, startTick, durationTicks, type: "midi", contentRef: "r" });
  }

  it("returns true for overlapping clips on same track", () => {
    expect(clipsOverlap(clip("a", "t1", 0, 960), clip("b", "t1", 480, 960))).toBe(true);
  });

  it("returns false for adjacent clips (no overlap)", () => {
    expect(clipsOverlap(clip("a", "t1", 0, 480), clip("b", "t1", 480, 480))).toBe(false);
  });

  it("returns false for clips on different tracks", () => {
    expect(clipsOverlap(clip("a", "t1", 0, 960), clip("b", "t2", 0, 960))).toBe(false);
  });

  it("returns true when one clip is fully inside another", () => {
    expect(clipsOverlap(clip("a", "t1", 0, 1920), clip("b", "t1", 480, 480))).toBe(true);
  });
});
