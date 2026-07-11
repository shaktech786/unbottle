/**
 * Tests for midiEventsToNotes — pure MIDI event → Note conversion.
 *
 * UNB-49: verify note pairing, chord handling, overlapping notes,
 * unmatched note-on closure, quantization, and empty input.
 */

import { describe, it, expect } from "vitest";
import { midiEventsToNotes } from "./recorder";
import type { RecordedMidiEvent } from "./recorder";
import { PPQ } from "@/lib/music/types";

const TRACK_ID = "track-1";
const BPM = 120;

function ticksFor(ms: number, bpm = BPM): number {
  return (bpm / 60 / 1000) * PPQ * ms;
}

describe("midiEventsToNotes", () => {
  it("returns [] for empty input", () => {
    expect(midiEventsToNotes([], { trackId: TRACK_ID, bpm: BPM })).toEqual([]);
  });

  it("converts a single note-on/note-off pair at a known bpm", () => {
    const events: RecordedMidiEvent[] = [
      { pitch: "C4", velocity: 100, type: "noteon", timeMs: 0 },
      { pitch: "C4", velocity: 0, type: "noteoff", timeMs: 500 },
    ];

    const notes = midiEventsToNotes(events, { trackId: TRACK_ID, bpm: BPM });

    expect(notes).toHaveLength(1);
    expect(notes[0].startTick).toBe(0);
    expect(notes[0].durationTicks).toBe(Math.round(ticksFor(500)));
    expect(notes[0].pitch).toBe("C4");
    expect(notes[0].trackId).toBe(TRACK_ID);
    expect(notes[0].velocity).toBe(100);
  });

  it("handles a chord: three simultaneous note-ons/offs, none dropped", () => {
    const events: RecordedMidiEvent[] = [
      { pitch: "C4", velocity: 90, type: "noteon", timeMs: 1000 },
      { pitch: "E4", velocity: 90, type: "noteon", timeMs: 1000 },
      { pitch: "G4", velocity: 90, type: "noteon", timeMs: 1000 },
      { pitch: "C4", velocity: 0, type: "noteoff", timeMs: 1400 },
      { pitch: "E4", velocity: 0, type: "noteoff", timeMs: 1400 },
      { pitch: "G4", velocity: 0, type: "noteoff", timeMs: 1400 },
    ];

    const notes = midiEventsToNotes(events, { trackId: TRACK_ID, bpm: BPM });

    expect(notes).toHaveLength(3);
    const pitches = notes.map((n) => n.pitch).sort();
    expect(pitches).toEqual(["C4", "E4", "G4"]);
    const startTicks = new Set(notes.map((n) => n.startTick));
    expect(startTicks.size).toBe(1);
  });

  it("handles overlapping notes: A on, B on, A off, B off", () => {
    const events: RecordedMidiEvent[] = [
      { pitch: "C4", velocity: 100, type: "noteon", timeMs: 0 },
      { pitch: "D4", velocity: 100, type: "noteon", timeMs: 200 },
      { pitch: "C4", velocity: 0, type: "noteoff", timeMs: 600 },
      { pitch: "D4", velocity: 0, type: "noteoff", timeMs: 900 },
    ];

    const notes = midiEventsToNotes(events, { trackId: TRACK_ID, bpm: BPM });

    expect(notes).toHaveLength(2);
    const noteC = notes.find((n) => n.pitch === "C4")!;
    const noteD = notes.find((n) => n.pitch === "D4")!;

    expect(noteC.startTick).toBe(0);
    expect(noteC.durationTicks).toBe(Math.round(ticksFor(600)));

    expect(noteD.startTick).toBe(Math.round(ticksFor(200)));
    expect(noteD.durationTicks).toBe(Math.round(ticksFor(700)));
  });

  it("closes an unmatched note-on at endMs", () => {
    const events: RecordedMidiEvent[] = [
      { pitch: "C4", velocity: 100, type: "noteon", timeMs: 0 },
    ];

    const notes = midiEventsToNotes(events, {
      trackId: TRACK_ID,
      bpm: BPM,
      endMs: 800,
    });

    expect(notes).toHaveLength(1);
    expect(notes[0].startTick).toBe(0);
    expect(notes[0].durationTicks).toBe(Math.round(ticksFor(800)));
  });

  it("snaps an off-grid startTick to the nearest quantizeTicks", () => {
    const quantizeTicks = PPQ / 4; // 120 ticks

    // Dummy earlier note pins baseMs at 0 so the C4 note below lands
    // off-grid: ticksPerMs = 0.96, onMs=100 -> raw startTick = round(96) = 96,
    // which is NOT a multiple of 120 and should snap to the nearest one (120).
    const events: RecordedMidiEvent[] = [
      { pitch: "E4", velocity: 100, type: "noteon", timeMs: 0 },
      { pitch: "E4", velocity: 0, type: "noteoff", timeMs: 50 },
      { pitch: "C4", velocity: 100, type: "noteon", timeMs: 100 },
      { pitch: "C4", velocity: 0, type: "noteoff", timeMs: 400 },
    ];

    const notes = midiEventsToNotes(events, {
      trackId: TRACK_ID,
      bpm: BPM,
      quantizeTicks,
    });

    const noteC = notes.find((n) => n.pitch === "C4")!;
    expect(noteC.startTick % quantizeTicks).toBe(0);
    expect(noteC.startTick).toBe(120);
  });
});
