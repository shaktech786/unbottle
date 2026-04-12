/**
 * Hum-to-MIDI: monophonic pitch detection using pitchy (autocorrelation /
 * McLeod pitch method). Takes raw PCM audio captured from the microphone,
 * runs frame-by-frame pitch detection, then groups consecutive frames at
 * the same MIDI note into note segments.
 */

import { PitchDetector } from "pitchy";
import type { Note, NoteName, Octave, Pitch } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";

export interface DetectionOptions {
  /** PCM sample rate in Hz */
  sampleRate: number;
  /** Window size for each pitch frame, in samples. Power of 2 recommended. */
  windowSize?: number;
  /** Step between successive windows, in samples */
  hopSize?: number;
  /**
   * Pitchy clarity threshold, 0-1. Frames below this are treated as silence.
   * Higher = stricter, fewer false notes from breath/noise.
   */
  minClarity?: number;
  /** RMS amplitude threshold for treating a frame as silence */
  minRmsAmplitude?: number;
  /** Minimum acceptable pitch in Hz (rejects rumble / unrealistic lows) */
  minFreqHz?: number;
  /** Maximum acceptable pitch in Hz (rejects whistle harmonics / squeaks) */
  maxFreqHz?: number;
  /** Minimum segment length in milliseconds; shorter ones are discarded */
  minDurationMs?: number;
  /** Allowed pitch jitter within a single segment, in cents */
  pitchStabilityCents?: number;
  /**
   * Auto-tune the detected pitches to the nearest note in this key, e.g.
   * "C major" or "A minor". When set, frequencies are mapped to the closest
   * in-key scale degree instead of the closest chromatic semitone, so a
   * singer who is slightly flat or sharp resolves to the correct note.
   */
  keySignature?: string;
}

export interface DetectedSegment {
  /** MIDI note number 0-127 */
  midiNote: number;
  /** Segment start time in milliseconds */
  startMs: number;
  /** Segment end time in milliseconds */
  endMs: number;
  /** Velocity 1-127, derived from RMS amplitude of the segment */
  velocity: number;
}

const DEFAULTS: Required<Omit<DetectionOptions, "sampleRate" | "keySignature">> = {
  windowSize: 2048,
  hopSize: 1024,
  minClarity: 0.9,
  minRmsAmplitude: 0.01,
  minFreqHz: 65, // C2
  maxFreqHz: 1200, // ~D6, comfortably above adult vocal range
  minDurationMs: 80,
  pitchStabilityCents: 80, // ~half a semitone
};

const MIDI_NOTE_NAMES: NoteName[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

/** Convert frequency in Hz to nearest MIDI note number (rounded). */
export function freqToMidi(hz: number): number {
  return Math.round(69 + 12 * Math.log2(hz / 440));
}

/** Convert frequency in Hz to a fractional MIDI note number (no rounding). */
function freqToMidiFloat(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

/** MIDI semitone offset within an octave for each note name. */
const NOTE_SEMITONE: Record<string, number> = {
  C: 0, "C#": 1, Db: 1,
  D: 2, "D#": 3, Eb: 3,
  E: 4, Fb: 4, "E#": 5,
  F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10,
  B: 11, Cb: 11, "B#": 0,
};

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

interface ParsedKey {
  rootSemitone: number;
  intervals: readonly number[];
}

/**
 * Parse a key signature like "C major", "A minor", "F# major" into the
 * root semitone (0-11) and the scale interval pattern. Returns null for
 * unrecognised input so the caller can fall back to chromatic snapping.
 */
export function parseKeySignature(key: string | undefined | null): ParsedKey | null {
  if (!key) return null;
  const m = key.trim().match(/^([A-G][#b]?)\s+(major|minor)$/i);
  if (!m) return null;
  const root = NOTE_SEMITONE[m[1]];
  if (root === undefined) return null;
  return {
    rootSemitone: root,
    intervals: m[2].toLowerCase() === "minor" ? MINOR_INTERVALS : MAJOR_INTERVALS,
  };
}

/**
 * Find the MIDI note in `key` closest to a fractional MIDI value.
 * Used to "auto-tune" a slightly off-key sung note onto the expected scale.
 */
export function snapMidiToScale(midiFloat: number, parsed: ParsedKey): number {
  const center = Math.round(midiFloat);
  let best = center;
  let bestDist = Infinity;
  // Search ±6 semitones — guarantees we find the nearest in-scale note
  for (let cand = center - 6; cand <= center + 6; cand++) {
    const semitone = ((cand % 12) + 12) % 12;
    const relative = (semitone - parsed.rootSemitone + 12) % 12;
    if (parsed.intervals.includes(relative)) {
      const dist = Math.abs(cand - midiFloat);
      if (dist < bestDist) {
        bestDist = dist;
        best = cand;
      }
    }
  }
  return best;
}

/** Convert MIDI note number to a Pitch ("C4", "F#3"). */
export function midiToPitch(midi: number): Pitch {
  // Clamp to 0..108 (C0..C9-ish), the app supports octaves 0..8
  const clamped = Math.max(0, Math.min(108, midi));
  const noteName = MIDI_NOTE_NAMES[clamped % 12];
  const octave = Math.max(0, Math.min(8, Math.floor(clamped / 12) - 1)) as Octave;
  return `${noteName}${octave}` as Pitch;
}

function rmsOf(samples: Float32Array, start: number, length: number): number {
  let sum = 0;
  const end = Math.min(start + length, samples.length);
  for (let i = start; i < end; i++) {
    const s = samples[i];
    sum += s * s;
  }
  return Math.sqrt(sum / Math.max(1, end - start));
}

interface Frame {
  midi: number | null;
  rms: number;
  timeMs: number;
}

/**
 * Run frame-by-frame pitch detection on a PCM buffer.
 * Returns one Frame per hop, with null midi for silent / unclear frames.
 *
 * If `parsedKey` is provided, each detected pitch is snapped to the
 * nearest in-scale note using the unrounded float MIDI value, so a
 * singer who is slightly off resolves to the expected scale degree.
 */
function detectFrames(
  samples: Float32Array,
  opts: Required<Omit<DetectionOptions, "keySignature">>,
  parsedKey: ParsedKey | null,
): Frame[] {
  const detector = PitchDetector.forFloat32Array(opts.windowSize);
  const frames: Frame[] = [];
  const window = new Float32Array(opts.windowSize);

  for (let start = 0; start + opts.windowSize <= samples.length; start += opts.hopSize) {
    // Copy into a fresh buffer so the detector sees aligned input
    window.set(samples.subarray(start, start + opts.windowSize));

    const rms = rmsOf(samples, start, opts.windowSize);
    const timeMs = (start / opts.sampleRate) * 1000;

    if (rms < opts.minRmsAmplitude) {
      frames.push({ midi: null, rms, timeMs });
      continue;
    }

    const [hz, clarity] = detector.findPitch(window, opts.sampleRate);
    if (
      clarity < opts.minClarity ||
      hz < opts.minFreqHz ||
      hz > opts.maxFreqHz ||
      !Number.isFinite(hz)
    ) {
      frames.push({ midi: null, rms, timeMs });
      continue;
    }

    const midiFloat = freqToMidiFloat(hz);
    const midi = parsedKey ? snapMidiToScale(midiFloat, parsedKey) : Math.round(midiFloat);
    frames.push({ midi, rms, timeMs });
  }

  return frames;
}

/** Group consecutive same-pitch frames into segments. */
function framesToSegments(
  frames: Frame[],
  opts: Required<Omit<DetectionOptions, "keySignature">>,
): DetectedSegment[] {
  const segments: DetectedSegment[] = [];
  if (frames.length === 0) return segments;

  // Frame duration in ms used as fall-back end time for the last frame
  const frameMs =
    frames.length >= 2 ? frames[1].timeMs - frames[0].timeMs : (opts.hopSize / opts.sampleRate) * 1000;

  let i = 0;
  while (i < frames.length) {
    const f = frames[i];
    if (f.midi === null) {
      i++;
      continue;
    }

    let j = i + 1;
    let rmsSum = f.rms;
    let rmsCount = 1;
    while (j < frames.length && frames[j].midi === f.midi) {
      rmsSum += frames[j].rms;
      rmsCount++;
      j++;
    }

    const startMs = f.timeMs;
    const endMs = j < frames.length ? frames[j].timeMs : frames[j - 1].timeMs + frameMs;
    const duration = endMs - startMs;

    if (duration >= opts.minDurationMs) {
      const avgRms = rmsSum / rmsCount;
      // Map RMS roughly to MIDI velocity. Most quiet humming sits around 0.05-0.3 RMS.
      const velocity = Math.max(1, Math.min(127, Math.round(avgRms * 400 + 32)));
      segments.push({
        midiNote: f.midi,
        startMs,
        endMs,
        velocity,
      });
    }

    i = j;
  }

  return segments;
}

/**
 * Detect monophonic pitch segments in a PCM buffer.
 *
 * The buffer is expected to be a single channel of float32 samples in
 * the range [-1, 1]. For multi-channel audio, downmix to mono first.
 */
export function detectPitchSegments(
  samples: Float32Array,
  options: DetectionOptions,
): DetectedSegment[] {
  const { keySignature, ...rest } = options;
  const opts: Required<Omit<DetectionOptions, "keySignature">> = { ...DEFAULTS, ...rest };
  if (opts.windowSize > samples.length) return [];
  const parsedKey = parseKeySignature(keySignature);
  const frames = detectFrames(samples, opts, parsedKey);
  return framesToSegments(frames, opts);
}

/**
 * Convert detected segments to Note objects targeting a specific track.
 * Note IDs are NOT assigned — the caller must add them.
 */
export function segmentsToNotes(
  segments: DetectedSegment[],
  trackId: string,
  bpm: number,
): Omit<Note, "id">[] {
  const ticksPerMs = (bpm / 60 / 1000) * PPQ;
  return segments.map((seg) => {
    const startTick = Math.round(seg.startMs * ticksPerMs);
    const durationTicks = Math.max(1, Math.round((seg.endMs - seg.startMs) * ticksPerMs));
    return {
      trackId,
      pitch: midiToPitch(seg.midiNote),
      startTick,
      durationTicks,
      velocity: seg.velocity,
    };
  });
}

/**
 * Decode an audio Blob (e.g. from MediaRecorder) into a mono Float32 buffer
 * via the Web Audio API. Browser only — uses AudioContext.
 */
export async function decodeBlobToMono(blob: Blob): Promise<{ samples: Float32Array; sampleRate: number }> {
  const arrayBuffer = await blob.arrayBuffer();
  // Lazy-construct an AudioContext so this module is safe to import in tests
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channelCount = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const out = new Float32Array(length);
    for (let ch = 0; ch < channelCount; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) out[i] += data[i];
    }
    if (channelCount > 1) {
      for (let i = 0; i < length; i++) out[i] /= channelCount;
    }
    return { samples: out, sampleRate: audioBuffer.sampleRate };
  } finally {
    void ctx.close();
  }
}
