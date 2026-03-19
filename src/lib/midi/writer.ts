import MidiWriter from "midi-writer-js";
import type { Note, Track } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";
import { INSTRUMENT_PROGRAM_MAP } from "./types";

/**
 * Convert internal tick-based duration to midi-writer-js duration string.
 * midi-writer-js expects duration as a string like "4" (quarter), "8" (eighth), etc.
 * We use the "T{ticks}" notation for exact tick-level precision.
 */
function ticksToDuration(ticks: number): string {
  return `T${ticks}`;
}

/**
 * Convert a Pitch string (e.g. "C#4") to a MIDI note number (0-127).
 */
function pitchToMidiNumber(pitch: string): number {
  const noteMap: Record<string, number> = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  };

  // Parse note name and octave from pitch string
  const match = pitch.match(/^([A-G]#?)(\d)$/);
  if (!match) {
    throw new Error(`Invalid pitch: ${pitch}`);
  }

  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const semitone = noteMap[noteName];

  if (semitone === undefined) {
    throw new Error(`Unknown note name: ${noteName}`);
  }

  // MIDI note number: (octave + 1) * 12 + semitone
  return (octave + 1) * 12 + semitone;
}

/**
 * Export tracks and notes to a standard MIDI file (Format 1).
 *
 * @param tracks - Array of Track objects defining instruments/channels
 * @param notes - Array of Note objects to include
 * @param bpm - Tempo in beats per minute
 * @returns Uint8Array of the MIDI file bytes
 */
export function exportToMidi(
  tracks: Track[],
  notes: Note[],
  bpm: number,
): Uint8Array {
  // Group notes by trackId
  const notesByTrack = new Map<string, Note[]>();
  for (const note of notes) {
    const existing = notesByTrack.get(note.trackId);
    if (existing) {
      existing.push(note);
    } else {
      notesByTrack.set(note.trackId, [note]);
    }
  }

  const midiTracks: MidiWriter.Track[] = [];

  for (const track of tracks) {
    const midiTrack = new MidiWriter.Track();

    // Set track name
    midiTrack.addTrackName(track.name);

    // Set tempo on the first track
    if (midiTracks.length === 0) {
      midiTrack.setTempo(bpm);
    }

    // Set instrument program
    const program = INSTRUMENT_PROGRAM_MAP[track.instrument] ?? 0;
    midiTrack.addEvent(
      new MidiWriter.ProgramChangeEvent({ instrument: program }),
    );

    // Get notes for this track, sorted by startTick
    const trackNotes = notesByTrack.get(track.id) ?? [];
    const sorted = [...trackNotes].sort((a, b) => a.startTick - b.startTick);

    // Convert notes to MIDI events with wait times
    let lastTick = 0;
    for (const note of sorted) {
      const waitTicks = note.startTick - lastTick;
      const midiNumber = pitchToMidiNumber(note.pitch);

      midiTrack.addEvent(
        new MidiWriter.NoteEvent({
          pitch: [midiNumber],
          duration: ticksToDuration(note.durationTicks),
          velocity: note.velocity,
          wait: waitTicks > 0 ? ticksToDuration(waitTicks) : undefined,
        }),
      );

      lastTick = note.startTick;
    }

    midiTracks.push(midiTrack);
  }

  const writer = new MidiWriter.Writer(midiTracks);

  // midi-writer-js v3 buildFile() returns a Uint8Array directly
  const dataUri = writer.dataUri();
  const base64 = dataUri.split(",")[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Patch the PPQ in the MIDI header.
  // The header is at bytes 0-13. Bytes 12-13 hold the division (ticks per quarter note).
  // midi-writer-js defaults to 128 PPQ; we want our custom PPQ (480).
  if (bytes.length >= 14) {
    bytes[12] = (PPQ >> 8) & 0xff;
    bytes[13] = PPQ & 0xff;
  }

  return bytes;
}
