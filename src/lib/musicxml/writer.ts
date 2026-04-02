/**
 * MusicXML writer — converts the app's Note/Track data to MusicXML format.
 * Produces MusicXML 4.0 partwise scores compatible with MuseScore, Finale, Sibelius, etc.
 */

import type { Note, Track } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";
import { INSTRUMENT_PROGRAM_MAP } from "@/lib/midi/types";

// ---------------------------------------------------------------------------
// Key signature helpers
// ---------------------------------------------------------------------------

const KEY_FIFTHS_MAP: Record<string, { fifths: number; mode: string }> = {
  "C major": { fifths: 0, mode: "major" },
  "G major": { fifths: 1, mode: "major" },
  "D major": { fifths: 2, mode: "major" },
  "A major": { fifths: 3, mode: "major" },
  "E major": { fifths: 4, mode: "major" },
  "B major": { fifths: 5, mode: "major" },
  "F# major": { fifths: 6, mode: "major" },
  "C# major": { fifths: 7, mode: "major" },
  "F major": { fifths: -1, mode: "major" },
  "Bb major": { fifths: -2, mode: "major" },
  "Eb major": { fifths: -3, mode: "major" },
  "Ab major": { fifths: -4, mode: "major" },
  "Db major": { fifths: -5, mode: "major" },
  "Gb major": { fifths: -6, mode: "major" },
  "Cb major": { fifths: -7, mode: "major" },
  "A minor": { fifths: 0, mode: "minor" },
  "E minor": { fifths: 1, mode: "minor" },
  "B minor": { fifths: 2, mode: "minor" },
  "F# minor": { fifths: 3, mode: "minor" },
  "C# minor": { fifths: 4, mode: "minor" },
  "G# minor": { fifths: 5, mode: "minor" },
  "D# minor": { fifths: 6, mode: "minor" },
  "A# minor": { fifths: 7, mode: "minor" },
  "D minor": { fifths: -1, mode: "minor" },
  "G minor": { fifths: -2, mode: "minor" },
  "C minor": { fifths: -3, mode: "minor" },
  "F minor": { fifths: -4, mode: "minor" },
  "Bb minor": { fifths: -5, mode: "minor" },
  "Eb minor": { fifths: -6, mode: "minor" },
  "Ab minor": { fifths: -7, mode: "minor" },
};

// Shorthand aliases (just root note → major)
const KEY_SHORTHAND: Record<string, string> = {
  C: "C major", D: "D major", E: "E major", F: "F major",
  G: "G major", A: "A major", B: "B major",
  "C#": "C# major", "D#": "D# major", "F#": "F# major",
  "G#": "G# major", "A#": "A# major",
  Db: "Db major", Eb: "Eb major", Gb: "Gb major",
  Ab: "Ab major", Bb: "Bb major",
  Cm: "C minor", Dm: "D minor", Em: "E minor", Fm: "F minor",
  Gm: "G minor", Am: "A minor", Bm: "B minor",
};

function parseKeySignature(key: string): { fifths: number; mode: string } {
  const normalized = KEY_SHORTHAND[key] ?? key;
  return KEY_FIFTHS_MAP[normalized] ?? { fifths: 0, mode: "major" };
}

// ---------------------------------------------------------------------------
// Pitch helpers
// ---------------------------------------------------------------------------

interface MusicXMLPitch {
  step: string;   // A-G
  alter: number;  // -1 flat, 0 natural, 1 sharp
  octave: number;
}

function parsePitch(pitch: string): MusicXMLPitch {
  const match = pitch.match(/^([A-G])([#b]?)(\d)$/);
  if (!match) return { step: "C", alter: 0, octave: 4 };

  const step = match[1];
  const accidental = match[2];
  const octave = parseInt(match[3], 10);

  let alter = 0;
  if (accidental === "#") alter = 1;
  else if (accidental === "b") alter = -1;

  return { step, alter, octave };
}

// ---------------------------------------------------------------------------
// Duration helpers
// ---------------------------------------------------------------------------

/** Standard note durations in ticks at PPQ=480 */
const DURATION_TYPES: { ticks: number; type: string; dots: number }[] = [
  // Dotted values first (longer) so we match greedily
  { ticks: 2880, type: "whole", dots: 1 },
  { ticks: 1920, type: "whole", dots: 0 },
  { ticks: 1440, type: "half", dots: 1 },
  { ticks: 960, type: "half", dots: 0 },
  { ticks: 720, type: "quarter", dots: 1 },
  { ticks: 480, type: "quarter", dots: 0 },
  { ticks: 360, type: "eighth", dots: 1 },
  { ticks: 240, type: "eighth", dots: 0 },
  { ticks: 180, type: "16th", dots: 1 },
  { ticks: 120, type: "16th", dots: 0 },
  { ticks: 90, type: "32nd", dots: 1 },
  { ticks: 60, type: "32nd", dots: 0 },
  { ticks: 30, type: "64th", dots: 0 },
];

/**
 * Break a duration into a sequence of tied note durations that map to
 * standard note types. Greedy: always picks the largest fitting duration.
 */
function decomposeDuration(ticks: number): { ticks: number; type: string; dots: number }[] {
  const result: { ticks: number; type: string; dots: number }[] = [];
  let remaining = ticks;

  while (remaining > 0) {
    let matched = false;
    for (const d of DURATION_TYPES) {
      if (d.ticks <= remaining) {
        result.push({ ...d });
        remaining -= d.ticks;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Duration too small to represent; use 64th as floor
      result.push({ ticks: remaining, type: "64th", dots: 0 });
      break;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Clef selection
// ---------------------------------------------------------------------------

/** Pick clef based on instrument type and actual note range */
function pickClef(instrument: string, notes: Note[]): { sign: string; line: number } {
  // Bass instruments always get bass clef
  if (instrument.startsWith("bass") || instrument === "drums") {
    return { sign: "F", line: 4 };
  }

  // If we have notes, use the average pitch to decide
  if (notes.length > 0) {
    const midiNums = notes.map((n) => {
      const p = parsePitch(n.pitch);
      const noteMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
      return (p.octave + 1) * 12 + (noteMap[p.step] ?? 0) + p.alter;
    });
    const avg = midiNums.reduce((a, b) => a + b, 0) / midiNums.length;
    if (avg < 55) return { sign: "F", line: 4 }; // Bass clef for low notes
  }

  return { sign: "G", line: 2 }; // Treble clef default
}

// ---------------------------------------------------------------------------
// Instrument display names
// ---------------------------------------------------------------------------

const INSTRUMENT_NAMES: Record<string, string> = {
  piano: "Piano",
  electric_piano: "Electric Piano",
  bass_electric: "Electric Bass",
  bass_synth: "Synth Bass",
  guitar_acoustic: "Acoustic Guitar",
  guitar_electric: "Electric Guitar",
  strings: "Strings",
  pad: "Pad",
  organ: "Organ",
  brass: "Brass",
  flute: "Flute",
  saxophone: "Saxophone",
  drums: "Drums",
  synth: "Synthesizer",
};

// ---------------------------------------------------------------------------
// XML escaping
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface MusicXMLExportOptions {
  title?: string;
  creator?: string;
  keySignature?: string;
  timeSignature?: string;
}

/**
 * Export tracks and notes to a MusicXML string.
 */
export function exportToMusicXML(
  tracks: Track[],
  notes: Note[],
  bpm: number,
  options: MusicXMLExportOptions = {},
): string {
  const {
    title = "Unbottle Export",
    creator = "Unbottle",
    keySignature = "C major",
    timeSignature = "4/4",
  } = options;

  const [beatsPerBar, beatType] = timeSignature.split("/").map(Number);
  const ticksPerMeasure = beatsPerBar * PPQ * (4 / beatType);
  const keyInfo = parseKeySignature(keySignature);

  // Group notes by track
  const notesByTrack = new Map<string, Note[]>();
  for (const note of notes) {
    const arr = notesByTrack.get(note.trackId);
    if (arr) arr.push(note);
    else notesByTrack.set(note.trackId, [note]);
  }

  // Find total measures needed
  let maxTick = 0;
  for (const note of notes) {
    const end = note.startTick + note.durationTicks;
    if (end > maxTick) maxTick = end;
  }
  const totalMeasures = Math.max(1, Math.ceil(maxTick / ticksPerMeasure));

  // Build XML
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">`);
  lines.push(`<score-partwise version="4.0">`);

  // Work metadata
  lines.push(`  <work><work-title>${esc(title)}</work-title></work>`);
  lines.push(`  <identification>`);
  lines.push(`    <creator type="software">${esc(creator)}</creator>`);
  lines.push(`    <encoding><software>Unbottle</software></encoding>`);
  lines.push(`  </identification>`);

  // Part list
  lines.push(`  <part-list>`);
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const partId = `P${i + 1}`;
    const name = INSTRUMENT_NAMES[track.instrument] ?? track.name;
    const program = (INSTRUMENT_PROGRAM_MAP[track.instrument] ?? 0) + 1; // MusicXML is 1-indexed
    lines.push(`    <score-part id="${partId}">`);
    lines.push(`      <part-name>${esc(track.name || name)}</part-name>`);
    lines.push(`      <midi-instrument id="${partId}-I1">`);
    lines.push(`        <midi-channel>${i < 9 ? i + 1 : i + 2}</midi-channel>`); // skip channel 10
    lines.push(`        <midi-program>${program}</midi-program>`);
    lines.push(`      </midi-instrument>`);
    lines.push(`    </score-part>`);
  }
  lines.push(`  </part-list>`);

  // Parts
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const partId = `P${i + 1}`;
    const trackNotes = notesByTrack.get(track.id) ?? [];
    const clef = pickClef(track.instrument, trackNotes);

    lines.push(`  <part id="${partId}">`);

    for (let m = 0; m < totalMeasures; m++) {
      const measureStart = m * ticksPerMeasure;
      const measureEnd = measureStart + ticksPerMeasure;

      lines.push(`    <measure number="${m + 1}">`);

      // Attributes on first measure
      if (m === 0) {
        lines.push(`      <attributes>`);
        lines.push(`        <divisions>${PPQ}</divisions>`);
        lines.push(`        <key>`);
        lines.push(`          <fifths>${keyInfo.fifths}</fifths>`);
        lines.push(`          <mode>${keyInfo.mode}</mode>`);
        lines.push(`        </key>`);
        lines.push(`        <time>`);
        lines.push(`          <beats>${beatsPerBar}</beats>`);
        lines.push(`          <beat-type>${beatType}</beat-type>`);
        lines.push(`        </time>`);
        lines.push(`        <clef>`);
        lines.push(`          <sign>${clef.sign}</sign>`);
        lines.push(`          <line>${clef.line}</line>`);
        lines.push(`        </clef>`);
        lines.push(`      </attributes>`);

        // Tempo marking (first part, first measure only)
        if (i === 0) {
          lines.push(`      <direction placement="above">`);
          lines.push(`        <direction-type>`);
          lines.push(`          <metronome>`);
          lines.push(`            <beat-unit>quarter</beat-unit>`);
          lines.push(`            <per-minute>${bpm}</per-minute>`);
          lines.push(`          </metronome>`);
          lines.push(`        </direction-type>`);
          lines.push(`        <sound tempo="${bpm}"/>`);
          lines.push(`      </direction>`);
        }
      }

      // Collect notes/events that start in this measure
      // Also include notes that started earlier but extend into this measure (ties)
      const measureNotes = trackNotes.filter((n) => {
        const noteEnd = n.startTick + n.durationTicks;
        return n.startTick < measureEnd && noteEnd > measureStart;
      });

      // Build time-sorted events within the measure
      interface MeasureEvent {
        tick: number; // relative to measure start
        pitch: string;
        duration: number; // ticks within this measure
        velocity: number;
        isChord: boolean;
        tieStart: boolean;
        tieStop: boolean;
      }

      const events: MeasureEvent[] = [];
      for (const note of measureNotes) {
        const noteStart = Math.max(note.startTick, measureStart);
        const noteEnd = Math.min(note.startTick + note.durationTicks, measureEnd);
        const relativeTick = noteStart - measureStart;
        const duration = noteEnd - noteStart;

        events.push({
          tick: relativeTick,
          pitch: note.pitch,
          duration,
          velocity: note.velocity,
          isChord: false,
          tieStart: note.startTick + note.durationTicks > measureEnd,
          tieStop: note.startTick < measureStart,
        });
      }

      // Sort by tick, then by pitch
      events.sort((a, b) => a.tick - b.tick || a.pitch.localeCompare(b.pitch));

      // Mark chords (multiple notes at same tick)
      for (let e = 1; e < events.length; e++) {
        if (events[e].tick === events[e - 1].tick) {
          events[e].isChord = true;
        }
      }

      // Render events with rests for gaps
      let currentTick = 0;

      for (const event of events) {
        // Insert rest if there's a gap (only before non-chord notes)
        if (!event.isChord && event.tick > currentTick) {
          const restDuration = event.tick - currentTick;
          const restParts = decomposeDuration(restDuration);
          for (const part of restParts) {
            lines.push(`      <note>`);
            lines.push(`        <rest/>`);
            lines.push(`        <duration>${part.ticks}</duration>`);
            lines.push(`        <type>${part.type}</type>`);
            for (let d = 0; d < part.dots; d++) {
              lines.push(`        <dot/>`);
            }
            lines.push(`      </note>`);
          }
        }

        // Decompose note duration for ties within measure
        const parts = decomposeDuration(event.duration);
        for (let p = 0; p < parts.length; p++) {
          const part = parts[p];
          const xmlPitch = parsePitch(event.pitch);

          lines.push(`      <note>`);
          if (event.isChord && p === 0) {
            lines.push(`        <chord/>`);
          }
          lines.push(`        <pitch>`);
          lines.push(`          <step>${xmlPitch.step}</step>`);
          if (xmlPitch.alter !== 0) {
            lines.push(`          <alter>${xmlPitch.alter}</alter>`);
          }
          lines.push(`          <octave>${xmlPitch.octave}</octave>`);
          lines.push(`        </pitch>`);
          lines.push(`        <duration>${part.ticks}</duration>`);

          // Ties
          const needTieStart = event.tieStart || p < parts.length - 1;
          const needTieStop = event.tieStop || p > 0;
          if (needTieStart || needTieStop) {
            if (needTieStart) lines.push(`        <tie type="start"/>`);
            if (needTieStop) lines.push(`        <tie type="stop"/>`);
          }

          lines.push(`        <type>${part.type}</type>`);
          for (let d = 0; d < part.dots; d++) {
            lines.push(`        <dot/>`);
          }

          // Dynamics from velocity
          const dynamics = Math.round((event.velocity / 127) * 100);
          lines.push(`        <dynamics><other-dynamics>${dynamics}</other-dynamics></dynamics>`);

          // Notations for ties
          if (needTieStart || needTieStop) {
            lines.push(`        <notations>`);
            if (needTieStart) lines.push(`          <tied type="start"/>`);
            if (needTieStop) lines.push(`          <tied type="stop"/>`);
            lines.push(`        </notations>`);
          }

          lines.push(`      </note>`);
        }

        if (!event.isChord) {
          currentTick = event.tick + event.duration;
        }
      }

      // Fill remaining measure with rest
      if (currentTick < ticksPerMeasure) {
        const restDuration = ticksPerMeasure - currentTick;
        const restParts = decomposeDuration(restDuration);
        for (const part of restParts) {
          lines.push(`      <note>`);
          lines.push(`        <rest/>`);
          lines.push(`        <duration>${part.ticks}</duration>`);
          lines.push(`        <type>${part.type}</type>`);
          for (let d = 0; d < part.dots; d++) {
            lines.push(`        <dot/>`);
          }
          lines.push(`      </note>`);
        }
      }

      lines.push(`    </measure>`);
    }

    lines.push(`  </part>`);
  }

  lines.push(`</score-partwise>`);
  return lines.join("\n");
}
