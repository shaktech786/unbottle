import { describe, it, expect } from "vitest";
import { computeContentSignature } from "./content-signature";
import type { Note, Track } from "@/lib/music/types";

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "track-1",
    sessionId: "session-1",
    name: "Piano",
    instrument: "piano",
    volume: 1,
    pan: 0,
    muted: false,
    solo: false,
    color: "#fff",
    sortOrder: 0,
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    trackId: "track-1",
    pitch: "C4",
    startTick: 0,
    durationTicks: 480,
    velocity: 100,
    ...overrides,
  };
}

describe("computeContentSignature", () => {
  it("produces the same signature for a new array reference with identical content", () => {
    const tracks = [makeTrack()];
    const notes = [makeNote()];

    const sigA = computeContentSignature(tracks, notes, 120, "C major", "4/4");
    const sigB = computeContentSignature([...tracks], [...notes], 120, "C major", "4/4");

    expect(sigA).toBe(sigB);
  });

  it("changes when a note's pitch changes", () => {
    const tracks = [makeTrack()];
    const notesA = [makeNote({ pitch: "C4" })];
    const notesB = [makeNote({ pitch: "D4" })];

    const sigA = computeContentSignature(tracks, notesA, 120, "C major", "4/4");
    const sigB = computeContentSignature(tracks, notesB, 120, "C major", "4/4");

    expect(sigA).not.toBe(sigB);
  });

  it("changes when a note's startTick or durationTicks changes", () => {
    const tracks = [makeTrack()];
    const base = computeContentSignature(tracks, [makeNote()], 120, "C major", "4/4");

    expect(computeContentSignature(tracks, [makeNote({ startTick: 480 })], 120, "C major", "4/4")).not.toBe(base);
    expect(computeContentSignature(tracks, [makeNote({ durationTicks: 240 })], 120, "C major", "4/4")).not.toBe(base);
  });

  it("changes when notes are added or removed", () => {
    const tracks = [makeTrack()];
    const sigOne = computeContentSignature(tracks, [makeNote()], 120, "C major", "4/4");
    const sigTwo = computeContentSignature(
      tracks,
      [makeNote(), makeNote({ id: "note-2", startTick: 480 })],
      120,
      "C major",
      "4/4",
    );

    expect(sigOne).not.toBe(sigTwo);
  });

  it("changes when a track's instrument changes", () => {
    const notes = [makeNote()];
    const sigA = computeContentSignature([makeTrack({ instrument: "piano" })], notes, 120, "C major", "4/4");
    const sigB = computeContentSignature([makeTrack({ instrument: "bass_electric" })], notes, 120, "C major", "4/4");

    expect(sigA).not.toBe(sigB);
  });

  it("changes when bpm, key signature, or time signature changes", () => {
    const tracks = [makeTrack()];
    const notes = [makeNote()];
    const base = computeContentSignature(tracks, notes, 120, "C major", "4/4");

    expect(computeContentSignature(tracks, notes, 140, "C major", "4/4")).not.toBe(base);
    expect(computeContentSignature(tracks, notes, 120, "G major", "4/4")).not.toBe(base);
    expect(computeContentSignature(tracks, notes, 120, "C major", "3/4")).not.toBe(base);
  });

  it("is order-sensitive for tracks and notes", () => {
    const trackA = makeTrack({ id: "a" });
    const trackB = makeTrack({ id: "b" });
    const noteA = makeNote({ id: "a" });
    const noteB = makeNote({ id: "b", startTick: 480 });

    const sig1 = computeContentSignature([trackA, trackB], [noteA, noteB], 120, "C major", "4/4");
    const sig2 = computeContentSignature([trackB, trackA], [noteB, noteA], 120, "C major", "4/4");

    expect(sig1).not.toBe(sig2);
  });
});
