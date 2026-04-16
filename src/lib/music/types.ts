// Core music domain types used across the entire application

export type NoteName = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
export type FlatNoteName = "Db" | "Eb" | "Gb" | "Ab" | "Bb";
/**
 * Roots a chord can be spelled with. Sharps are the canonical internal form
 * (matches NoteName / Pitch), but flats are accepted because they're
 * harmonically meaningful: e.g. in C minor the bVI is Ab, not G#. Use
 * `normalizeChordRoot` to coerce a flat to its sharp enharmonic equivalent
 * when you need a NoteName for MIDI / scale / pitch lookups.
 */
export type ChordRoot = NoteName | FlatNoteName;
export type Octave = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Pitch = `${NoteName}${Octave}`;

const FLAT_TO_SHARP: Record<FlatNoteName, NoteName> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

/** Convert a flat-spelled root to its sharp enharmonic equivalent. */
export function normalizeChordRoot(root: ChordRoot): NoteName {
  return (FLAT_TO_SHARP as Record<string, NoteName>)[root] ?? (root as NoteName);
}

export interface Note {
  id: string;
  trackId: string;
  sectionId?: string;
  pitch: Pitch;
  startTick: number;
  durationTicks: number;
  velocity: number; // 0-127
}

export interface Chord {
  root: ChordRoot;
  quality: "major" | "minor" | "diminished" | "augmented" | "dominant7" | "major7" | "minor7" | "sus2" | "sus4" | "add9" | "power";
  bass?: ChordRoot; // slash chord
}

export interface ChordEvent {
  chord: Chord;
  durationBars: number;
}

export type SectionType = "intro" | "verse" | "pre_chorus" | "chorus" | "bridge" | "outro" | "breakdown" | "custom";

export interface Section {
  id: string;
  sessionId: string;
  name: string;
  type: SectionType;
  startBar: number;
  lengthBars: number;
  chordProgression: ChordEvent[];
  sortOrder: number;
  color: string;
}

export type InstrumentType =
  | "piano"
  | "electric_piano"
  | "bass_electric"
  | "bass_synth"
  | "guitar_acoustic"
  | "guitar_electric"
  | "strings"
  | "pad"
  | "organ"
  | "brass"
  | "flute"
  | "saxophone"
  | "drums"
  | "synth";

/**
 * Legacy instrument types that may exist in the database.
 * Maps old values to the closest new InstrumentType.
 */
const LEGACY_INSTRUMENT_MAP: Record<string, InstrumentType> = {
  am_synth: "synth",
  fm_synth: "electric_piano",
  membrane_synth: "drums",
  metal_synth: "drums",
  mono_synth: "bass_synth",
  pluck_synth: "guitar_acoustic",
  poly_synth: "pad",
  sampler: "piano",
};

/**
 * Normalizes an instrument value from the DB (which may contain legacy types)
 * into a valid current InstrumentType.
 */
export function normalizeInstrumentType(raw: string): InstrumentType {
  const VALID_TYPES: Set<string> = new Set([
    "piano", "electric_piano", "bass_electric", "bass_synth",
    "guitar_acoustic", "guitar_electric", "strings", "pad",
    "organ", "brass", "flute", "saxophone", "drums", "synth",
  ]);
  if (VALID_TYPES.has(raw)) return raw as InstrumentType;
  return LEGACY_INSTRUMENT_MAP[raw] ?? "synth";
}

export interface Track {
  id: string;
  sessionId: string;
  name: string;
  instrument: InstrumentType;
  volume: number; // 0-1
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  color: string;
  sortOrder: number;
}

export interface Session {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: "active" | "paused" | "completed" | "archived";
  bpm: number;
  keySignature: string;
  timeSignature: string;
  genre?: string;
  mood?: string;
  parentBranchId?: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface Bookmark {
  id: string;
  sessionId: string;
  label: string;
  description?: string;
  contextSnapshot: {
    currentSection?: string;
    chatSummary?: string;
    lastAction?: string;
    activeTrackId?: string;
    playheadPosition?: number;
    bpm?: number;
    keySignature?: string;
    sectionCount?: number;
    noteCount?: number;
  };
  createdAt: string;
}

export interface CaptureData {
  id: string;
  sessionId: string;
  type: "audio" | "tap" | "text";
  audioUrl?: string;
  transcription?: string;
  detectedNotes?: { pitch: Pitch; start: number; duration: number }[];
  detectedRhythm?: { time: number; velocity: number }[];
  textDescription?: string;
  durationMs?: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    suggestions?: string[];
    arrangementRef?: string;
    captureRef?: string;
  };
  createdAt: string;
}

export interface Suggestion {
  id: string;
  label: string;
  action: string;
  category: "arrangement" | "instrument" | "structure" | "capture" | "export" | "general";
}

// Sequencer state
export interface SequencerState {
  isPlaying: boolean;
  currentTick: number;
  loopStart?: number;
  loopEnd?: number;
  isLooping: boolean;
}

// PPQ (Pulses Per Quarter note) - resolution of the sequencer
export const PPQ = 480;

// Helper to convert bars to ticks
export function barsToTicks(bars: number, timeSignature = "4/4"): number {
  const [beatsPerBar] = timeSignature.split("/").map(Number);
  return bars * beatsPerBar * PPQ;
}

// Helper to convert ticks to seconds
export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks / PPQ) * (60 / bpm);
}

// Chord display helper
export function chordToString(chord: Chord): string {
  const qualityMap: Record<Chord["quality"], string> = {
    major: "",
    minor: "m",
    diminished: "dim",
    augmented: "aug",
    dominant7: "7",
    major7: "maj7",
    minor7: "m7",
    sus2: "sus2",
    sus4: "sus4",
    add9: "add9",
    power: "5",
  };
  const base = `${chord.root}${qualityMap[chord.quality]}`;
  return chord.bass ? `${base}/${chord.bass}` : base;
}
