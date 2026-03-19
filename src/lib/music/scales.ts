import type { NoteName } from "./types";

export const ALL_NOTES: NoteName[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Scale intervals (semitones from root)
export const SCALE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  "harmonic minor": [0, 2, 3, 5, 7, 8, 11],
  "melodic minor": [0, 2, 3, 5, 7, 9, 11],
  pentatonic: [0, 2, 4, 7, 9],
  "minor pentatonic": [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export function getScaleNotes(root: NoteName, scale: string = "major"): NoteName[] {
  const rootIndex = ALL_NOTES.indexOf(root);
  const intervals = SCALE_INTERVALS[scale] ?? SCALE_INTERVALS.major;
  return intervals.map((interval) => ALL_NOTES[(rootIndex + interval) % 12]);
}

export function isNoteInScale(note: NoteName, root: NoteName, scale: string = "major"): boolean {
  const scaleNotes = getScaleNotes(root, scale);
  return scaleNotes.includes(note);
}

// Note to MIDI number conversion
export function noteToMidi(note: string): number {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 60; // default to C4
  const [, name, octave] = match;
  const noteIndex = ALL_NOTES.indexOf(name as NoteName);
  return (parseInt(octave) + 1) * 12 + noteIndex;
}

export function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${ALL_NOTES[noteIndex]}${octave}`;
}

// Common chord voicings (intervals from root in semitones)
export const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  power: [0, 7],
};

export function getChordNotes(root: NoteName, quality: string, octave: number = 4): string[] {
  const rootMidi = noteToMidi(`${root}${octave}`);
  const intervals = CHORD_INTERVALS[quality] ?? CHORD_INTERVALS.major;
  return intervals.map((interval) => midiToNote(rootMidi + interval));
}

// Key signatures for display
export const KEY_SIGNATURES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm",
] as const;

export const TIME_SIGNATURES = ["4/4", "3/4", "6/8", "2/4", "5/4", "7/8"] as const;

export const GENRE_PRESETS = [
  "Electronic", "Hip Hop", "R&B", "Pop", "Rock", "Jazz",
  "Lo-Fi", "Ambient", "Classical", "Film Score", "Indie",
  "Trap", "House", "Techno", "Drum & Bass", "Downtempo",
] as const;

export const MOOD_PRESETS = [
  "Dark", "Uplifting", "Melancholic", "Aggressive", "Dreamy",
  "Funky", "Chill", "Intense", "Ethereal", "Groovy",
  "Nostalgic", "Mysterious", "Euphoric", "Raw",
] as const;
