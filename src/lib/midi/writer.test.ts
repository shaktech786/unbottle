import { describe, it, expect } from "vitest";
import { exportToMidi, pitchToMidiNumber } from "./writer";
import type { Track, Note } from "@/lib/music/types";

describe("pitchToMidiNumber", () => {
  // Sharp notes (existing behavior)
  it("converts C4 to MIDI 60", () => {
    expect(pitchToMidiNumber("C4")).toBe(60);
  });

  it("converts C#4 to MIDI 61", () => {
    expect(pitchToMidiNumber("C#4")).toBe(61);
  });

  it("converts A4 to MIDI 69", () => {
    expect(pitchToMidiNumber("A4")).toBe(69);
  });

  it("converts C0 to MIDI 12", () => {
    expect(pitchToMidiNumber("C0")).toBe(12);
  });

  // Flat notes (currently broken)
  it("converts Db4 to MIDI 61", () => {
    expect(pitchToMidiNumber("Db4")).toBe(61);
  });

  it("converts Eb3 to MIDI 51", () => {
    expect(pitchToMidiNumber("Eb3")).toBe(51);
  });

  it("converts Gb4 to MIDI 66", () => {
    expect(pitchToMidiNumber("Gb4")).toBe(66);
  });

  it("converts Ab2 to MIDI 44", () => {
    expect(pitchToMidiNumber("Ab2")).toBe(44);
  });

  it("converts Bb5 to MIDI 82", () => {
    expect(pitchToMidiNumber("Bb5")).toBe(82);
  });

  it("throws on invalid pitch", () => {
    expect(() => pitchToMidiNumber("X4")).toThrow("Invalid pitch");
    expect(() => pitchToMidiNumber("")).toThrow("Invalid pitch");
  });
});

describe("exportToMidi", () => {
  const track: Track = {
    id: "t1",
    sessionId: "s1",
    name: "Piano",
    instrument: "piano",
    volume: 1,
    pan: 0,
    muted: false,
    solo: false,
    color: "#fff",
    sortOrder: 0,
  };

  it("returns a valid MIDI file header", () => {
    const notes: Note[] = [
      {
        id: "n1",
        trackId: "t1",
        pitch: "C4",
        startTick: 0,
        durationTicks: 480,
        velocity: 100,
      },
    ];
    const bytes = exportToMidi([track], notes, 120);

    // MIDI header: "MThd"
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("MThd");

    // PPQ should be patched to 480 (0x01E0) at bytes 12-13
    expect((bytes[12] << 8) | bytes[13]).toBe(480);
  });

  it("handles empty notes without crashing", () => {
    const bytes = exportToMidi([track], [], 120);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("handles notes with flat pitches", () => {
    const notes: Note[] = [
      {
        id: "n1",
        trackId: "t1",
        pitch: "Eb3" as Note["pitch"],
        startTick: 0,
        durationTicks: 480,
        velocity: 90,
      },
    ];
    // Should not throw
    const bytes = exportToMidi([track], notes, 120);
    expect(bytes).toBeInstanceOf(Uint8Array);
  });
});
