/**
 * MusicXML parser — converts MusicXML files into the app's Note/Track data.
 * Handles MusicXML 3.x and 4.x partwise scores.
 */

import type { Note, Track, InstrumentType, Pitch, NoteName, Octave } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";

// ---------------------------------------------------------------------------
// MIDI program → InstrumentType mapping (reverse of INSTRUMENT_PROGRAM_MAP)
// ---------------------------------------------------------------------------

const PROGRAM_TO_INSTRUMENT: Record<number, InstrumentType> = {
  0: "piano", 1: "piano", 2: "piano", 3: "piano",
  4: "electric_piano", 5: "electric_piano", 6: "electric_piano", 7: "electric_piano",
  18: "organ", 19: "organ", 20: "organ", 21: "organ",
  24: "guitar_acoustic", 25: "guitar_acoustic",
  26: "guitar_electric", 27: "guitar_electric", 28: "guitar_electric", 29: "guitar_electric",
  33: "bass_electric", 34: "bass_electric", 35: "bass_electric", 36: "bass_electric",
  37: "bass_synth", 38: "bass_synth", 39: "bass_synth",
  48: "strings", 49: "strings", 50: "strings", 51: "strings",
  61: "brass", 62: "brass", 63: "brass",
  65: "saxophone", 66: "saxophone", 67: "saxophone", 68: "saxophone",
  73: "flute", 74: "flute", 75: "flute",
  80: "synth", 81: "synth", 82: "synth", 83: "synth",
  88: "pad", 89: "pad", 90: "pad", 91: "pad",
  118: "drums", 119: "drums",
};

function programToInstrument(program: number): InstrumentType {
  return PROGRAM_TO_INSTRUMENT[program] ?? "piano";
}

// ---------------------------------------------------------------------------
// Simple XML helpers (no DOM dependency for server-side use)
// ---------------------------------------------------------------------------

function getTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function getTagAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
  return xml.match(re) ?? [];
}

function getAttr(xml: string, attr: string): string | null {
  const re = new RegExp(`${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

function hasTag(xml: string, tag: string): boolean {
  return new RegExp(`<${tag}[\\s/>]`, "i").test(xml);
}

// ---------------------------------------------------------------------------
// Pitch helpers
// ---------------------------------------------------------------------------

function stepAlterOctaveToPitch(step: string, alter: number, octave: number): Pitch {
  const sharpMap: Record<string, NoteName> = {
    "C-1": "B", "C0": "C", "C1": "C#",
    "D-1": "C#", "D0": "D", "D1": "D#",
    "E-1": "D#", "E0": "E", "E1": "F",
    "F-1": "E", "F0": "F", "F1": "F#",
    "G-1": "F#", "G0": "G", "G1": "G#",
    "A-1": "G#", "A0": "A", "A1": "A#",
    "B-1": "A#", "B0": "B", "B1": "C",
  };

  const key = `${step}${alter}`;
  const noteName = sharpMap[key] ?? (step as NoteName);

  // Adjust octave for B# (wraps up) and Cb (wraps down)
  let finalOctave = octave;
  if (step === "B" && alter === 1) finalOctave = octave + 1;
  if (step === "C" && alter === -1) finalOctave = octave - 1;

  const clampedOctave = Math.max(0, Math.min(8, finalOctave)) as Octave;
  return `${noteName}${clampedOctave}` as Pitch;
}

// ---------------------------------------------------------------------------
// Key signature parsing
// ---------------------------------------------------------------------------

function fifthsToKeySignature(fifths: number, mode: string): string {
  const majorKeys = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
  const minorKeys = ["Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#"];

  const index = fifths + 7; // fifths range is -7 to 7
  if (mode === "minor") {
    const root = minorKeys[index] ?? "A";
    return `${root} minor`;
  }
  const root = majorKeys[index] ?? "C";
  return `${root} major`;
}

// ---------------------------------------------------------------------------
// Main parse result
// ---------------------------------------------------------------------------

export interface MusicXMLParseResult {
  tracks: Omit<Track, "id" | "sessionId">[];
  notes: Omit<Note, "id">[];
  bpm: number;
  keySignature: string;
  timeSignature: string;
  title?: string;
}

// Track colors for imported parts
const IMPORT_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b",
  "#8b5cf6", "#10b981", "#f43f5e", "#3b82f6",
];

/**
 * Parse a MusicXML string into tracks and notes.
 */
export function parseMusicXML(xml: string): MusicXMLParseResult {
  const result: MusicXMLParseResult = {
    tracks: [],
    notes: [],
    bpm: 120,
    keySignature: "C major",
    timeSignature: "4/4",
  };

  // Title
  const workTitle = getTag(xml, "work-title");
  const movementTitle = getTag(xml, "movement-title");
  result.title = workTitle ?? movementTitle ?? undefined;

  // Parse part-list to get track info
  const partList = getTag(xml, "part-list");
  if (!partList) return result;

  const scoreParts = getTagAll(partList, "score-part");
  const partIdToIndex = new Map<string, number>();

  for (let i = 0; i < scoreParts.length; i++) {
    const sp = scoreParts[i];
    const partId = getAttr(sp, "id") ?? `P${i + 1}`;
    partIdToIndex.set(partId, i);

    const partName = getTag(sp, "part-name") ?? `Part ${i + 1}`;
    const midiProgram = getTag(sp, "midi-program");
    const program = midiProgram ? parseInt(midiProgram, 10) - 1 : 0; // MusicXML is 1-indexed

    const instrument = programToInstrument(program);

    result.tracks.push({
      name: partName,
      instrument,
      volume: 1,
      pan: 0,
      muted: false,
      solo: false,
      color: IMPORT_COLORS[i % IMPORT_COLORS.length],
      sortOrder: i,
    });
  }

  // Parse parts (note data)
  const parts = getTagAll(xml, "part");

  for (const partXml of parts) {
    const partId = getAttr(partXml, "id");
    const trackIndex = partId ? (partIdToIndex.get(partId) ?? -1) : -1;
    if (trackIndex < 0) continue;

    // Use a placeholder trackId — caller will assign real IDs
    const trackId = `import_track_${trackIndex}`;

    let divisions = PPQ; // default
    let currentTick = 0;

    const measures = getTagAll(partXml, "measure");

    for (const measureXml of measures) {
      // Check for attributes changes
      const attributes = getTag(measureXml, "attributes");
      if (attributes) {
        const divisionsStr = getTag(attributes, "divisions");
        if (divisionsStr) divisions = parseInt(divisionsStr, 10);

        const fifthsStr = getTag(attributes, "fifths");
        const modeStr = getTag(attributes, "mode");
        if (fifthsStr && trackIndex === 0) {
          result.keySignature = fifthsToKeySignature(
            parseInt(fifthsStr, 10),
            modeStr ?? "major",
          );
        }

        const beatsStr = getTag(attributes, "beats");
        const beatTypeStr = getTag(attributes, "beat-type");
        if (beatsStr && beatTypeStr && trackIndex === 0) {
          result.timeSignature = `${beatsStr}/${beatTypeStr}`;
        }
      }

      // Check for tempo in direction
      const directions = getTagAll(measureXml, "direction");
      for (const dir of directions) {
        const perMinute = getTag(dir, "per-minute");
        if (perMinute) {
          result.bpm = parseFloat(perMinute);
        }
        const sound = dir.match(/<sound[^>]*tempo="([\d.]+)"/);
        if (sound) {
          result.bpm = parseFloat(sound[1]);
        }
      }

      // Parse notes
      const noteElements = getTagAll(measureXml, "note");

      for (const noteXml of noteElements) {
        // Skip rests
        if (hasTag(noteXml, "rest")) {
          // Still advance time for non-chord rests
          if (!hasTag(noteXml, "chord")) {
            const durStr = getTag(noteXml, "duration");
            if (durStr) {
              const xmlDuration = parseInt(durStr, 10);
              currentTick += Math.round((xmlDuration / divisions) * PPQ);
            }
          }
          continue;
        }

        // Check if it's a chord (don't advance time)
        const isChord = hasTag(noteXml, "chord");

        // Parse pitch
        const pitchXml = getTag(noteXml, "pitch");
        if (!pitchXml) continue;

        const step = getTag(pitchXml, "step") ?? "C";
        const alterStr = getTag(pitchXml, "alter");
        const alter = alterStr ? parseInt(alterStr, 10) : 0;
        const octaveStr = getTag(pitchXml, "octave") ?? "4";
        const octave = parseInt(octaveStr, 10);

        const pitch = stepAlterOctaveToPitch(step, alter, octave);

        // Parse duration
        const durStr = getTag(noteXml, "duration");
        const xmlDuration = durStr ? parseInt(durStr, 10) : divisions;
        const durationTicks = Math.round((xmlDuration / divisions) * PPQ);

        // Parse velocity from dynamics. Look in <notations> first
        // (schema-correct location), then fall back to direct child of <note>
        // for files written by older Unbottle builds.
        let velocity = 80;
        const notationsTag = getTag(noteXml, "notations");
        const dynamicsTag =
          (notationsTag ? getTag(notationsTag, "dynamics") : null) ??
          getTag(noteXml, "dynamics");
        if (dynamicsTag) {
          const dynValue = getTag(dynamicsTag, "other-dynamics");
          if (dynValue) {
            velocity = Math.round((parseFloat(dynValue) / 100) * 127);
          }
        }

        // Check for tied notes — skip continuation notes (tie type="stop" without type="start")
        const hasTieStop = /type="stop"/.test(noteXml.match(/<tie[^/]*\/>/g)?.join("") ?? "");
        const hasTieStart = /type="start"/.test(noteXml.match(/<tie[^/]*\/>/g)?.join("") ?? "");

        // For tied continuations, we extend the previous note instead of creating a new one
        if (hasTieStop && !hasTieStart) {
          // Find the previous note with same pitch on this track and extend it
          const prevNote = result.notes.findLast(
            (n) => n.trackId === trackId && n.pitch === pitch,
          );
          if (prevNote) {
            prevNote.durationTicks += durationTicks;
          }
          if (!isChord) {
            currentTick += durationTicks;
          }
          continue;
        }

        // For chord notes, go back to the start of the last non-chord note
        let chordStartTick = currentTick;
        if (isChord) {
          // Find the last non-chord note's start tick
          for (let n = result.notes.length - 1; n >= 0; n--) {
            if (result.notes[n].trackId === trackId) {
              chordStartTick = result.notes[n].startTick;
              break;
            }
          }
        }

        result.notes.push({
          trackId,
          pitch,
          startTick: isChord ? chordStartTick : currentTick,
          durationTicks,
          velocity: Math.max(1, Math.min(127, velocity)),
        });

        if (!isChord) {
          currentTick += durationTicks;
        }
      }
    }
  }

  return result;
}
