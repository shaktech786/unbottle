import { describe, it, expect } from "vitest";
import {
  noteToMidi,
  midiToNote,
  getChordNotes,
  getScaleNotes,
} from "./scales";

describe("noteToMidi", () => {
  it("converts C4 to 60", () => {
    expect(noteToMidi("C4")).toBe(60);
  });

  it("converts A4 to 69", () => {
    expect(noteToMidi("A4")).toBe(69);
  });

  // Currently noteToMidi only handles sharps — should handle flats too
  it("converts Db4 (flat) to 61", () => {
    expect(noteToMidi("Db4")).toBe(61);
  });

  it("converts Eb3 (flat) to 51", () => {
    expect(noteToMidi("Eb3")).toBe(51);
  });

  it("converts Bb5 (flat) to 82", () => {
    expect(noteToMidi("Bb5")).toBe(82);
  });

  it("returns 60 for invalid input", () => {
    expect(noteToMidi("invalid")).toBe(60);
  });
});

describe("midiToNote", () => {
  it("converts 60 to C4", () => {
    expect(midiToNote(60)).toBe("C4");
  });

  it("converts 69 to A4", () => {
    expect(midiToNote(69)).toBe("A4");
  });

  it("converts 61 to C#4", () => {
    expect(midiToNote(61)).toBe("C#4");
  });
});

describe("getChordNotes", () => {
  it("returns correct notes for C major", () => {
    const notes = getChordNotes("C", "major", 4);
    expect(notes).toEqual(["C4", "E4", "G4"]);
  });

  it("returns correct notes for A minor", () => {
    const notes = getChordNotes("A", "minor", 3);
    expect(notes).toEqual(["A3", "C4", "E4"]);
  });

  it("returns correct notes for G dominant7", () => {
    const notes = getChordNotes("G", "dominant7", 3);
    expect(notes).toEqual(["G3", "B3", "D4", "F4"]);
  });
});

describe("getScaleNotes", () => {
  it("returns C major scale notes", () => {
    expect(getScaleNotes("C", "major")).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
  });

  it("returns A minor scale notes", () => {
    expect(getScaleNotes("A", "minor")).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });
});
