import { describe, it, expect } from "vitest";
import {
  freqToMidi,
  midiToPitch,
  detectPitchSegments,
  segmentsToNotes,
  parseKeySignature,
  snapMidiToScale,
} from "./hum-to-midi";
import { PPQ } from "@/lib/music/types";

const SAMPLE_RATE = 44100;

/** Concatenate several sine-wave segments into a single PCM buffer. */
function buildSignal(segments: { freqHz: number; durationMs: number; amplitude?: number }[]): Float32Array {
  const totalSamples = segments.reduce(
    (acc, s) => acc + Math.floor((s.durationMs / 1000) * SAMPLE_RATE),
    0,
  );
  const out = new Float32Array(totalSamples);
  let offset = 0;
  for (const seg of segments) {
    const len = Math.floor((seg.durationMs / 1000) * SAMPLE_RATE);
    const amp = seg.amplitude ?? 0.4;
    if (seg.freqHz <= 0) {
      // silence
      offset += len;
      continue;
    }
    const omega = 2 * Math.PI * seg.freqHz;
    for (let i = 0; i < len; i++) {
      out[offset + i] = amp * Math.sin((omega * i) / SAMPLE_RATE);
    }
    offset += len;
  }
  return out;
}

describe("freqToMidi", () => {
  it("maps A4 (440 Hz) to MIDI 69", () => {
    expect(freqToMidi(440)).toBe(69);
  });
  it("maps C4 (261.63 Hz) to MIDI 60", () => {
    expect(freqToMidi(261.63)).toBe(60);
  });
  it("rounds nearby frequencies to the closest semitone", () => {
    // ~25 cents flat of A4 is still A4
    expect(freqToMidi(440 * Math.pow(2, -25 / 1200))).toBe(69);
  });
});

describe("midiToPitch", () => {
  it("maps MIDI 60 to C4", () => {
    expect(midiToPitch(60)).toBe("C4");
  });
  it("maps MIDI 69 to A4", () => {
    expect(midiToPitch(69)).toBe("A4");
  });
  it("maps MIDI 61 to C#4", () => {
    expect(midiToPitch(61)).toBe("C#4");
  });
  it("clamps very high notes to a valid octave", () => {
    expect(midiToPitch(150)).toMatch(/^[A-G]#?8$/);
  });
});

describe("detectPitchSegments", () => {
  it("detects a single sustained A4 note", () => {
    const signal = buildSignal([{ freqHz: 440, durationMs: 500 }]);
    const segments = detectPitchSegments(signal, { sampleRate: SAMPLE_RATE });
    expect(segments.length).toBeGreaterThanOrEqual(1);
    expect(segments[0].midiNote).toBe(69);
  });

  it("detects two distinct notes separated by silence", () => {
    const signal = buildSignal([
      { freqHz: 440, durationMs: 300 }, // A4
      { freqHz: 0, durationMs: 150 }, // silence
      { freqHz: 523.25, durationMs: 300 }, // C5
    ]);
    const segments = detectPitchSegments(signal, { sampleRate: SAMPLE_RATE });
    const notes = segments.map((s) => s.midiNote);
    expect(notes).toContain(69);
    expect(notes).toContain(72);
  });

  it("detects an ascending arpeggio C4 E4 G4 C5", () => {
    const signal = buildSignal([
      { freqHz: 261.63, durationMs: 250 }, // C4
      { freqHz: 329.63, durationMs: 250 }, // E4
      { freqHz: 392.0, durationMs: 250 }, // G4
      { freqHz: 523.25, durationMs: 250 }, // C5
    ]);
    const segments = detectPitchSegments(signal, { sampleRate: SAMPLE_RATE });
    // Allow ±1 cent for any rare frame jitter at boundaries
    const notes = segments.map((s) => s.midiNote);
    expect(notes).toContain(60);
    expect(notes).toContain(64);
    expect(notes).toContain(67);
    expect(notes).toContain(72);
    // and the segments are in time order
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].startMs).toBeGreaterThanOrEqual(segments[i - 1].startMs);
    }
  });

  it("ignores pure silence", () => {
    const signal = new Float32Array(SAMPLE_RATE / 2); // 500ms of zeros
    const segments = detectPitchSegments(signal, { sampleRate: SAMPLE_RATE });
    expect(segments).toHaveLength(0);
  });

  it("rejects sub-bass rumble below minFreqHz", () => {
    // 40 Hz tone — below default 65 Hz floor
    const signal = buildSignal([{ freqHz: 40, durationMs: 500, amplitude: 0.5 }]);
    const segments = detectPitchSegments(signal, { sampleRate: SAMPLE_RATE });
    expect(segments).toHaveLength(0);
  });

  it("respects minDurationMs by discarding very short notes", () => {
    // 30ms is far below the 80ms default minimum
    const signal = buildSignal([
      { freqHz: 440, durationMs: 30 },
      { freqHz: 0, durationMs: 200 },
    ]);
    const segments = detectPitchSegments(signal, { sampleRate: SAMPLE_RATE });
    expect(segments).toHaveLength(0);
  });

  it("returns segments with timing in milliseconds, in order", () => {
    const signal = buildSignal([
      { freqHz: 440, durationMs: 200 },
      { freqHz: 0, durationMs: 100 },
      { freqHz: 523.25, durationMs: 200 },
    ]);
    const segments = detectPitchSegments(signal, { sampleRate: SAMPLE_RATE });
    expect(segments.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < segments.length; i++) {
      expect(segments[i].endMs).toBeGreaterThan(segments[i].startMs);
      if (i > 0) expect(segments[i].startMs).toBeGreaterThanOrEqual(segments[i - 1].endMs - 50);
    }
  });
});

describe("parseKeySignature", () => {
  it("parses C major", () => {
    const k = parseKeySignature("C major");
    expect(k).not.toBeNull();
    expect(k!.rootSemitone).toBe(0);
    expect(k!.intervals).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("parses A minor", () => {
    const k = parseKeySignature("A minor");
    expect(k).not.toBeNull();
    expect(k!.rootSemitone).toBe(9);
    expect(k!.intervals).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it("parses sharp keys", () => {
    expect(parseKeySignature("F# major")!.rootSemitone).toBe(6);
    expect(parseKeySignature("C# minor")!.rootSemitone).toBe(1);
  });

  it("parses flat keys", () => {
    expect(parseKeySignature("Bb major")!.rootSemitone).toBe(10);
    expect(parseKeySignature("Eb minor")!.rootSemitone).toBe(3);
  });

  it("returns null for nonsense", () => {
    expect(parseKeySignature("nope")).toBeNull();
    expect(parseKeySignature(undefined)).toBeNull();
    expect(parseKeySignature("")).toBeNull();
  });
});

describe("snapMidiToScale (auto-tune to key)", () => {
  const cMajor = parseKeySignature("C major")!;
  const aMinor = parseKeySignature("A minor")!;
  const eMajor = parseKeySignature("E major")!;

  it("leaves notes already in key alone", () => {
    expect(snapMidiToScale(60, cMajor)).toBe(60); // C4
    expect(snapMidiToScale(64, cMajor)).toBe(64); // E4
    expect(snapMidiToScale(67, cMajor)).toBe(67); // G4
  });

  it("snaps a slightly sharp note (60.3) back to C", () => {
    expect(snapMidiToScale(60.3, cMajor)).toBe(60);
  });

  it("snaps a slightly flat note (60.4) up to C if closer", () => {
    expect(snapMidiToScale(59.7, cMajor)).toBe(60);
  });

  it("snaps an out-of-key C# towards C or D in C major", () => {
    // C#4 is exactly between C and D — both are valid scale notes
    const result = snapMidiToScale(61, cMajor);
    expect([60, 62]).toContain(result);
  });

  it("snaps F#4 to F or G in C major (whichever is closer)", () => {
    // Slightly closer to F → F
    expect(snapMidiToScale(65.4, cMajor)).toBe(65);
    // Slightly closer to G → G
    expect(snapMidiToScale(66.6, cMajor)).toBe(67);
  });

  it("respects the minor scale", () => {
    // C natural is in A minor
    expect(snapMidiToScale(60, aMinor)).toBe(60);
    // F# is NOT in A minor — should snap to F or G
    const result = snapMidiToScale(66, aMinor);
    expect([65, 67]).toContain(result);
  });

  it("respects sharp keys (E major has F#, G#, C#, D#)", () => {
    // F natural is NOT in E major. E (64) and F# (66) are both 1 semitone
    // away — either is a valid snap target.
    expect([64, 66]).toContain(snapMidiToScale(65, eMajor));
    // F# is in E major
    expect(snapMidiToScale(66, eMajor)).toBe(66);
    // A slightly sharp F# (66.2) stays on F#
    expect(snapMidiToScale(66.2, eMajor)).toBe(66);
    // A flat G (66.7) snaps to F# (in scale) rather than G (out of scale)
    expect(snapMidiToScale(66.7, eMajor)).toBe(66);
  });
});

describe("detectPitchSegments with auto-tune", () => {
  it("snaps a slightly sharp 'A4' (444 Hz) back to A4 in C major", () => {
    // 444 Hz ≈ A4 + 16 cents — should still resolve to MIDI 69
    const signal = buildSignal([{ freqHz: 444, durationMs: 400 }]);
    const segments = detectPitchSegments(signal, {
      sampleRate: SAMPLE_RATE,
      keySignature: "C major",
    });
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0].midiNote).toBe(69);
  });

  it("auto-tunes a flat C5 (515 Hz) onto C5 in C major", () => {
    // 515 Hz ≈ ~28 cents flat of C5 (523.25). Within scale snap.
    const signal = buildSignal([{ freqHz: 515, durationMs: 400 }]);
    const segments = detectPitchSegments(signal, {
      sampleRate: SAMPLE_RATE,
      keySignature: "C major",
    });
    expect(segments[0].midiNote).toBe(72);
  });

  it("snaps an off-scale F# in C major to either F or G", () => {
    // Pure F#4 (~370 Hz)
    const signal = buildSignal([{ freqHz: 370, durationMs: 400 }]);
    const segments = detectPitchSegments(signal, {
      sampleRate: SAMPLE_RATE,
      keySignature: "C major",
    });
    expect(segments.length).toBeGreaterThan(0);
    expect([65, 67]).toContain(segments[0].midiNote);
  });

  it("without keySignature, returns the chromatic semitone (F#4)", () => {
    const signal = buildSignal([{ freqHz: 369.99, durationMs: 400 }]);
    const segments = detectPitchSegments(signal, { sampleRate: SAMPLE_RATE });
    expect(segments[0].midiNote).toBe(66); // F#4 chromatic
  });
});

describe("segmentsToNotes", () => {
  it("converts segments to notes with correct trackId and pitch", () => {
    const segments = [
      { midiNote: 60, startMs: 0, endMs: 500, velocity: 80 },
      { midiNote: 67, startMs: 500, endMs: 1000, velocity: 90 },
    ];
    const notes = segmentsToNotes(segments, "track-x", 120);
    expect(notes).toHaveLength(2);
    expect(notes[0].trackId).toBe("track-x");
    expect(notes[0].pitch).toBe("C4");
    expect(notes[1].pitch).toBe("G4");
  });

  it("converts ms to ticks at the given bpm", () => {
    // At 120 BPM, 500ms = 1 beat = PPQ ticks
    const segments = [{ midiNote: 60, startMs: 0, endMs: 500, velocity: 80 }];
    const notes = segmentsToNotes(segments, "t", 120);
    expect(notes[0].startTick).toBe(0);
    expect(notes[0].durationTicks).toBe(PPQ);
  });

  it("scales tick conversion linearly with bpm", () => {
    // At 60 BPM, 1000ms = 1 beat = PPQ ticks
    const segments = [{ midiNote: 60, startMs: 0, endMs: 1000, velocity: 80 }];
    const notes = segmentsToNotes(segments, "t", 60);
    expect(notes[0].durationTicks).toBe(PPQ);
  });

  it("preserves velocity exactly", () => {
    const segments = [{ midiNote: 60, startMs: 0, endMs: 500, velocity: 73 }];
    const notes = segmentsToNotes(segments, "t", 120);
    expect(notes[0].velocity).toBe(73);
  });
});
