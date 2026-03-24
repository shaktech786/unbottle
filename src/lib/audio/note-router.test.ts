import { describe, it, expect } from "vitest";
import { routeNotesToTracks } from "./note-router";
import type { Note, Track, InstrumentType } from "@/lib/music/types";

function makeTrack(overrides: Partial<Track> & { id: string; instrument: InstrumentType }): Track {
  return {
    sessionId: "s1",
    name: "Track",
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    color: "#fff",
    sortOrder: 0,
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> & { id: string; trackId: string }): Note {
  return {
    pitch: "C4",
    startTick: 0,
    durationTicks: 480,
    velocity: 100,
    ...overrides,
  };
}

describe("routeNotesToTracks", () => {
  it("groups notes by trackId and associates the correct instrument", () => {
    const tracks: Track[] = [
      makeTrack({ id: "t1", instrument: "piano" }),
      makeTrack({ id: "t2", instrument: "bass_electric" }),
    ];
    const notes: Note[] = [
      makeNote({ id: "n1", trackId: "t1", pitch: "C4" }),
      makeNote({ id: "n2", trackId: "t1", pitch: "E4" }),
      makeNote({ id: "n3", trackId: "t2", pitch: "E2" }),
    ];

    const result = routeNotesToTracks(notes, tracks);

    expect(result.size).toBe(2);
    expect(result.get("t1")!.instrument).toBe("piano");
    expect(result.get("t1")!.notes).toHaveLength(2);
    expect(result.get("t2")!.instrument).toBe("bass_electric");
    expect(result.get("t2")!.notes).toHaveLength(1);
  });

  it("excludes notes from muted tracks", () => {
    const tracks: Track[] = [
      makeTrack({ id: "t1", instrument: "piano", muted: true }),
      makeTrack({ id: "t2", instrument: "strings" }),
    ];
    const notes: Note[] = [
      makeNote({ id: "n1", trackId: "t1" }),
      makeNote({ id: "n2", trackId: "t2" }),
    ];

    const result = routeNotesToTracks(notes, tracks);

    expect(result.has("t1")).toBe(false);
    expect(result.get("t2")!.notes).toHaveLength(1);
  });

  it("in solo mode, only includes soloed tracks", () => {
    const tracks: Track[] = [
      makeTrack({ id: "t1", instrument: "piano", solo: true }),
      makeTrack({ id: "t2", instrument: "strings" }),
      makeTrack({ id: "t3", instrument: "drums", solo: true }),
    ];
    const notes: Note[] = [
      makeNote({ id: "n1", trackId: "t1" }),
      makeNote({ id: "n2", trackId: "t2" }),
      makeNote({ id: "n3", trackId: "t3" }),
    ];

    const result = routeNotesToTracks(notes, tracks);

    expect(result.size).toBe(2);
    expect(result.has("t1")).toBe(true);
    expect(result.has("t2")).toBe(false);
    expect(result.has("t3")).toBe(true);
  });

  it("includes all tracks when none are soloed", () => {
    const tracks: Track[] = [
      makeTrack({ id: "t1", instrument: "piano" }),
      makeTrack({ id: "t2", instrument: "strings" }),
    ];
    const notes: Note[] = [
      makeNote({ id: "n1", trackId: "t1" }),
      makeNote({ id: "n2", trackId: "t2" }),
    ];

    const result = routeNotesToTracks(notes, tracks);

    expect(result.size).toBe(2);
  });

  it("solo overrides mute (soloed+muted track is included)", () => {
    const tracks: Track[] = [
      makeTrack({ id: "t1", instrument: "piano", solo: true, muted: true }),
      makeTrack({ id: "t2", instrument: "strings" }),
    ];
    const notes: Note[] = [
      makeNote({ id: "n1", trackId: "t1" }),
      makeNote({ id: "n2", trackId: "t2" }),
    ];

    const result = routeNotesToTracks(notes, tracks);

    expect(result.size).toBe(1);
    expect(result.has("t1")).toBe(true);
    expect(result.has("t2")).toBe(false);
  });

  it("omits notes whose trackId does not match any track", () => {
    const tracks: Track[] = [
      makeTrack({ id: "t1", instrument: "piano" }),
    ];
    const notes: Note[] = [
      makeNote({ id: "n1", trackId: "t1" }),
      makeNote({ id: "n2", trackId: "unknown" }),
    ];

    const result = routeNotesToTracks(notes, tracks);

    expect(result.size).toBe(1);
    expect(result.get("t1")!.notes).toHaveLength(1);
  });

  it("returns an empty map when there are no notes", () => {
    const tracks: Track[] = [
      makeTrack({ id: "t1", instrument: "piano" }),
    ];

    const result = routeNotesToTracks([], tracks);

    expect(result.size).toBe(0);
  });

  it("returns an empty map when there are no tracks", () => {
    const notes: Note[] = [
      makeNote({ id: "n1", trackId: "t1" }),
    ];

    const result = routeNotesToTracks(notes, []);

    expect(result.size).toBe(0);
  });

  it("preserves track volume and pan in the result", () => {
    const tracks: Track[] = [
      makeTrack({ id: "t1", instrument: "piano", volume: 0.5, pan: -0.3 }),
    ];
    const notes: Note[] = [
      makeNote({ id: "n1", trackId: "t1" }),
    ];

    const result = routeNotesToTracks(notes, tracks);

    expect(result.get("t1")!.volume).toBe(0.5);
    expect(result.get("t1")!.pan).toBe(-0.3);
  });
});
