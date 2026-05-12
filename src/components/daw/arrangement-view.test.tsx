// @vitest-environment jsdom
/**
 * MAIN-170 — Rendering tests for the arrangement view with synthetic clip data.
 *
 * Three test suites:
 *  1. ArrangementCanvas clip position geometry — pure math, no DOM required
 *  2. TrackHeader / TrackHeaderList — mute, solo, arm toggle state
 *  3. Drag interaction — clip position changes via useTimeline dispatcher
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  makeTimelineClip,
  makeTimelineTrack,
  ticksToPixels,
  pixelsToTicks,
  snapToGrid,
  PPQ_DEFAULT as PPQ,
  type TimelineTrack,
  type TimelineClip,
} from "@/lib/timeline/types";
import { defaultTimelineState, useTimeline } from "@/lib/timeline/use-timeline";
import { TrackHeader, TrackHeaderList } from "./track-header";
import { renderHook, act } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSyntheticTrack(
  id: string,
  laneIndex: number,
  overrides: Partial<TimelineTrack> = {},
): TimelineTrack {
  return makeTimelineTrack({ id, name: `Track ${id}`, type: "midi", laneIndex, ...overrides });
}

function makeSyntheticClip(
  id: string,
  trackId: string,
  startTick: number,
  durationTicks: number,
  overrides: Partial<TimelineClip> = {},
): TimelineClip {
  return makeTimelineClip({ id, trackId, startTick, durationTicks, type: "midi", contentRef: "ref", ...overrides });
}

// ---------------------------------------------------------------------------
// Suite 1 — Canvas clip position geometry (pure tick/pixel math)
// ---------------------------------------------------------------------------

describe("ArrangementCanvas — clip position geometry", () => {
  const PPT = 0.25; // 0.25 px per tick — default zoom level

  it("clip starting at tick 0 maps to x=0 at zero scroll", () => {
    const clip = makeSyntheticClip("c1", "t1", 0, PPQ * 4);
    const x = ticksToPixels(clip.startTick, PPT);
    expect(x).toBe(0);
  });

  it("clip starting at tick PPQ maps to x=120 at 0.25 ppt", () => {
    const clip = makeSyntheticClip("c1", "t1", PPQ, PPQ);
    const x = ticksToPixels(clip.startTick, PPT);
    expect(x).toBe(120); // 480 * 0.25 = 120
  });

  it("clip width matches durationTicks * pixelsPerTick", () => {
    const clip = makeSyntheticClip("c1", "t1", 0, PPQ * 2);
    const w = ticksToPixels(clip.durationTicks, PPT);
    expect(w).toBe(240); // 960 * 0.25 = 240
  });

  it("two clips at different start ticks have proportional x positions", () => {
    const c1 = makeSyntheticClip("c1", "t1", 0, PPQ);
    const c2 = makeSyntheticClip("c2", "t1", PPQ * 2, PPQ);
    const x1 = ticksToPixels(c1.startTick, PPT);
    const x2 = ticksToPixels(c2.startTick, PPT);
    expect(x2 - x1).toBe(ticksToPixels(PPQ * 2, PPT));
  });

  it("scroll offset shifts clip x by the equivalent scrolled ticks", () => {
    const clip = makeSyntheticClip("c1", "t1", PPQ * 4, PPQ);
    const scrollX = ticksToPixels(PPQ * 2, PPT); // scroll 2 bars
    const screenX = ticksToPixels(clip.startTick, PPT) - scrollX;
    expect(screenX).toBe(ticksToPixels(PPQ * 2, PPT)); // 240
  });

  it("pixelsToTicks is the inverse of ticksToPixels", () => {
    const originalTick = PPQ * 3 + 120;
    const px = ticksToPixels(originalTick, PPT);
    expect(pixelsToTicks(px, PPT)).toBeCloseTo(originalTick);
  });

  it("snapToGrid rounds a drag position to the nearest grid line", () => {
    // 700 < 720 (1.5 * 480) → rounds down to 480
    expect(snapToGrid(700, PPQ)).toBe(PPQ);
    // 750 > 720 (1.5 * 480) → rounds up to 960
    expect(snapToGrid(750, PPQ)).toBe(PPQ * 2);
    // 200 → snaps to 0
    expect(snapToGrid(200, PPQ)).toBe(0);
  });

  it("a clip scrolled off-screen left has negative screenX", () => {
    const clip = makeSyntheticClip("c1", "t1", PPQ, PPQ);
    const scrollX = ticksToPixels(PPQ * 3, PPT); // scroll past clip
    const screenX = ticksToPixels(clip.startTick, PPT) - scrollX;
    expect(screenX).toBeLessThan(0);
  });

  it("track Y offset accumulates by laneHeight", () => {
    const tracks = [
      makeSyntheticTrack("t1", 0, { laneHeight: 80 }),
      makeSyntheticTrack("t2", 1, { laneHeight: 60 }),
      makeSyntheticTrack("t3", 2, { laneHeight: 80 }),
    ];
    const sorted = [...tracks].sort((a, b) => a.laneIndex - b.laneIndex);
    let acc = 0;
    const yOffsets: number[] = [];
    for (const t of sorted) {
      yOffsets.push(acc);
      acc += t.laneHeight;
    }
    expect(yOffsets).toEqual([0, 80, 140]);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — TrackHeader mute / solo / arm toggle state
// ---------------------------------------------------------------------------

describe("TrackHeader — mute, solo, arm toggles", () => {
  function makeTrack(overrides: Partial<TimelineTrack> = {}): TimelineTrack {
    return makeSyntheticTrack("t1", 0, overrides);
  }

  it("renders the Mute button and fires onMute when clicked", async () => {
    const onMute = vi.fn();
    const track = makeTrack({ muted: false });
    render(<TrackHeader track={track} onMute={onMute} />);

    const btn = screen.getByTitle("Mute");
    fireEvent.click(btn);

    expect(onMute).toHaveBeenCalledTimes(1);
    expect(onMute).toHaveBeenCalledWith("t1");
  });

  it("renders the Solo button and fires onSolo when clicked", async () => {
    const onSolo = vi.fn();
    const track = makeTrack({ solo: false });
    render(<TrackHeader track={track} onSolo={onSolo} />);

    const btn = screen.getByTitle("Solo");
    fireEvent.click(btn);

    expect(onSolo).toHaveBeenCalledTimes(1);
    expect(onSolo).toHaveBeenCalledWith("t1");
  });

  it("renders the Record arm button and fires onArm when clicked", async () => {
    const onArm = vi.fn();
    const track = makeTrack({ armed: false });
    render(<TrackHeader track={track} onArm={onArm} />);

    const btn = screen.getByTitle("Record arm");
    fireEvent.click(btn);

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledWith("t1");
  });

  it("muted track shows Mute button with active styling (bg-red-600 class)", () => {
    const track = makeTrack({ muted: true });
    const { container } = render(<TrackHeader track={track} />);
    const btn = container.querySelector('[title="Mute"]');
    expect(btn?.className).toContain("bg-red-600");
  });

  it("solo track shows Solo button with active styling (bg-amber-500 class)", () => {
    const track = makeTrack({ solo: true });
    const { container } = render(<TrackHeader track={track} />);
    const btn = container.querySelector('[title="Solo"]');
    expect(btn?.className).toContain("bg-amber-500");
  });

  it("armed track shows Record arm button with active styling (bg-rose-600 class)", () => {
    const track = makeTrack({ armed: true });
    const { container } = render(<TrackHeader track={track} />);
    const btn = container.querySelector('[title="Record arm"]');
    expect(btn?.className).toContain("bg-rose-600");
  });

  it("fires onSelect when the header background is clicked", () => {
    const onSelect = vi.fn();
    const track = makeTrack();
    const { container } = render(<TrackHeader track={track} onSelect={onSelect} />);
    const div = container.firstChild as HTMLElement;
    fireEvent.click(div);
    expect(onSelect).toHaveBeenCalledWith("t1");
  });

  it("mute click does not trigger onSelect", () => {
    const onSelect = vi.fn();
    const onMute = vi.fn();
    const track = makeTrack();
    render(<TrackHeader track={track} onSelect={onSelect} onMute={onMute} />);
    fireEvent.click(screen.getByTitle("Mute"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onMute).toHaveBeenCalledWith("t1");
  });

  it("track name is editable: double-click enters edit mode", async () => {
    const user = userEvent.setup();
    const onNameChange = vi.fn();
    const track = makeTrack({ name: "Piano" });
    render(<TrackHeader track={track} onNameChange={onNameChange} />);

    await user.dblClick(screen.getByText("Piano"));

    const input = screen.getByDisplayValue("Piano") as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it("track name change fires onNameChange with trimmed value on Enter", async () => {
    const user = userEvent.setup();
    const onNameChange = vi.fn();
    const track = makeTrack({ name: "Piano" });
    render(<TrackHeader track={track} onNameChange={onNameChange} />);

    await user.dblClick(screen.getByText("Piano"));
    const input = screen.getByDisplayValue("Piano");
    await user.clear(input);
    await user.type(input, "  Synth Bass  ");
    await user.keyboard("{Enter}");

    expect(onNameChange).toHaveBeenCalledWith("t1", "Synth Bass");
  });

  it("Escape reverts the name edit without calling onNameChange", async () => {
    const user = userEvent.setup();
    const onNameChange = vi.fn();
    const track = makeTrack({ name: "Piano" });
    render(<TrackHeader track={track} onNameChange={onNameChange} />);

    await user.dblClick(screen.getByText("Piano"));
    await user.keyboard("{Escape}");

    expect(onNameChange).not.toHaveBeenCalled();
    expect(screen.getByText("Piano")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — TrackHeaderList ordering
// ---------------------------------------------------------------------------

describe("TrackHeaderList — track ordering", () => {
  it("renders tracks sorted by laneIndex regardless of array order", () => {
    const tracks = [
      makeSyntheticTrack("t3", 2, { name: "Bass" }),
      makeSyntheticTrack("t1", 0, { name: "Drums" }),
      makeSyntheticTrack("t2", 1, { name: "Piano" }),
    ];
    const { container } = render(<TrackHeaderList tracks={tracks} />);
    const names = Array.from(container.querySelectorAll("span.truncate")).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Drums", "Piano", "Bass"]);
  });

  it("applies isSelected styling only to the selected track", () => {
    const tracks = [
      makeSyntheticTrack("t1", 0, { name: "A" }),
      makeSyntheticTrack("t2", 1, { name: "B" }),
    ];
    const { container } = render(
      <TrackHeaderList tracks={tracks} selectedTrackId="t2" />,
    );
    const headers = container.querySelectorAll(".cursor-pointer");
    // selected header should have bg-neutral-800/70
    expect(headers[1].className).toContain("bg-neutral-800/70");
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Drag interaction: useTimeline clip position mutations
// ---------------------------------------------------------------------------

describe("useTimeline — drag interaction clip position mutations", () => {
  function setup() {
    const { result } = renderHook(() => useTimeline());
    return result;
  }

  it("MOVE_CLIP updates startTick on the same track", () => {
    const result = setup();

    act(() => {
      result.current.addTrack({ id: "t1", name: "Track 1", type: "midi", laneIndex: 0 });
      result.current.addClip({
        id: "c1",
        trackId: "t1",
        startTick: 0,
        durationTicks: PPQ * 2,
        type: "midi",
        contentRef: "ref",
      });
    });

    act(() => {
      result.current.moveClip("c1", PPQ * 4); // move to bar 5
    });

    const clip = result.current.state.tracks[0].clips[0];
    expect(clip.startTick).toBe(PPQ * 4);
  });

  it("MOVE_CLIP to a different track changes trackId and removes clip from old track", () => {
    const result = setup();

    act(() => {
      result.current.addTrack({ id: "t1", name: "Track 1", type: "midi", laneIndex: 0 });
      result.current.addTrack({ id: "t2", name: "Track 2", type: "midi", laneIndex: 1 });
      result.current.addClip({
        id: "c1",
        trackId: "t1",
        startTick: 0,
        durationTicks: PPQ,
        type: "midi",
        contentRef: "ref",
      });
    });

    act(() => {
      result.current.moveClip("c1", PPQ * 2, "t2");
    });

    const t1 = result.current.state.tracks.find((t) => t.id === "t1")!;
    const t2 = result.current.state.tracks.find((t) => t.id === "t2")!;
    expect(t1.clips).toHaveLength(0);
    expect(t2.clips).toHaveLength(1);
    expect(t2.clips[0].startTick).toBe(PPQ * 2);
    expect(t2.clips[0].trackId).toBe("t2");
  });

  it("MOVE_CLIP clamps startTick to 0 (no negative positions)", () => {
    const result = setup();

    act(() => {
      result.current.addTrack({ id: "t1", name: "Track 1", type: "midi", laneIndex: 0 });
      result.current.addClip({
        id: "c1",
        trackId: "t1",
        startTick: PPQ,
        durationTicks: PPQ,
        type: "midi",
        contentRef: "ref",
      });
    });

    act(() => {
      result.current.moveClip("c1", -500); // negative tick
    });

    const clip = result.current.state.tracks[0].clips[0];
    expect(clip.startTick).toBe(0);
  });

  it("RESIZE_CLIP updates durationTicks via resizeClip", () => {
    const result = setup();

    act(() => {
      result.current.addTrack({ id: "t1", name: "Track 1", type: "midi", laneIndex: 0 });
      result.current.addClip({
        id: "c1",
        trackId: "t1",
        startTick: 0,
        durationTicks: PPQ,
        type: "midi",
        contentRef: "ref",
      });
    });

    act(() => {
      result.current.resizeClip("c1", PPQ * 3);
    });

    const clip = result.current.state.tracks[0].clips[0];
    expect(clip.durationTicks).toBe(PPQ * 3);
  });

  it("RESIZE_CLIP enforces minimum duration of 1 tick", () => {
    const result = setup();

    act(() => {
      result.current.addTrack({ id: "t1", name: "Track 1", type: "midi", laneIndex: 0 });
      result.current.addClip({
        id: "c1",
        trackId: "t1",
        startTick: 0,
        durationTicks: PPQ,
        type: "midi",
        contentRef: "ref",
      });
    });

    act(() => {
      result.current.resizeClip("c1", 0); // invalid duration
    });

    const clip = result.current.state.tracks[0].clips[0];
    expect(clip.durationTicks).toBeGreaterThanOrEqual(1);
  });

  it("mute toggle changes track.muted state", () => {
    const result = setup();

    act(() => {
      result.current.addTrack({ id: "t1", name: "Track 1", type: "midi", laneIndex: 0 });
    });

    act(() => {
      result.current.updateTrack("t1", { muted: true });
    });

    expect(result.current.state.tracks[0].muted).toBe(true);
  });

  it("solo toggle changes track.solo state", () => {
    const result = setup();

    act(() => {
      result.current.addTrack({ id: "t1", name: "Track 1", type: "midi", laneIndex: 0 });
    });

    act(() => {
      result.current.updateTrack("t1", { solo: true });
    });

    expect(result.current.state.tracks[0].solo).toBe(true);
  });

  it("multiple clips on same track remain sorted by startTick after move", () => {
    const result = setup();

    act(() => {
      result.current.addTrack({ id: "t1", name: "Track 1", type: "midi", laneIndex: 0 });
      result.current.addClip({ id: "c1", trackId: "t1", startTick: 0, durationTicks: PPQ, type: "midi", contentRef: "r1" });
      result.current.addClip({ id: "c2", trackId: "t1", startTick: PPQ * 2, durationTicks: PPQ, type: "midi", contentRef: "r2" });
    });

    act(() => {
      result.current.moveClip("c1", PPQ * 4); // move c1 past c2
    });

    const clips = result.current.state.tracks[0].clips;
    expect(clips[0].id).toBe("c2");
    expect(clips[1].id).toBe("c1");
  });
});
