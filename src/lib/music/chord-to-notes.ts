/**
 * Converts chord progressions from arrangement sections into Note objects
 * that can be placed directly in the piano roll / sequencer.
 *
 * Each chord becomes a stack of 3-4 simultaneous notes at the correct
 * time position, using proper voicings from scales.ts.
 */

import type { Note, Pitch, Section } from "./types";
import { barsToTicks } from "./types";
import { getChordNotes } from "./scales";

/** Default octave for chord voicings -- C3-C4 range sounds warm and full. */
const CHORD_OCTAVE = 3;

/** Default MIDI velocity for generated chord notes. */
const DEFAULT_VELOCITY = 90;

/**
 * Generate a unique ID for a note. Matches the pattern used in use-sequencer.ts.
 */
function generateNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Converts chord progressions across all provided sections into Note objects
 * positioned correctly in time on the piano roll.
 *
 * @param sections    - Arrangement sections containing chord progressions
 * @param trackId     - The track ID to assign to each generated note
 * @param timeSignature - Time signature string (e.g. "4/4") for tick calculation
 * @returns Array of Note objects ready to add to the sequencer
 */
export function chordProgressionToNotes(
  sections: Section[],
  trackId: string,
  _bpm: number,
  timeSignature: string = "4/4",
): Note[] {
  const notes: Note[] = [];

  for (const section of sections) {
    if (!section.chordProgression || section.chordProgression.length === 0) {
      continue;
    }

    // Starting tick for this section (sections define their own startBar)
    const sectionStartTick = barsToTicks(section.startBar, timeSignature);

    // Walk through chord events within the section
    let chordOffsetBars = 0;

    for (const chordEvent of section.chordProgression) {
      const chordStartTick = sectionStartTick + barsToTicks(chordOffsetBars, timeSignature);
      const chordDurationTicks = barsToTicks(chordEvent.durationBars, timeSignature);

      // Get the actual note pitches for this chord
      const chordPitches = getChordNotes(
        chordEvent.chord.root,
        chordEvent.chord.quality,
        CHORD_OCTAVE,
      );

      // Create a Note for each pitch in the chord (stacked at the same startTick)
      for (const pitchStr of chordPitches) {
        notes.push({
          id: generateNoteId(),
          trackId,
          sectionId: section.id,
          pitch: pitchStr as Pitch,
          startTick: chordStartTick,
          durationTicks: chordDurationTicks,
          velocity: DEFAULT_VELOCITY,
        });
      }

      chordOffsetBars += chordEvent.durationBars;
    }
  }

  return notes;
}

/**
 * Calculate the total duration in ticks across all sections.
 * Useful for ensuring the sequencer has enough bars.
 */
export function totalSectionsTicks(
  sections: Section[],
  timeSignature: string = "4/4",
): number {
  if (sections.length === 0) return 0;

  let maxTick = 0;
  for (const section of sections) {
    const endTick = barsToTicks(section.startBar + section.lengthBars, timeSignature);
    if (endTick > maxTick) maxTick = endTick;
  }
  return maxTick;
}

/**
 * Convenience: how many bars total do the sections span?
 */
export function totalSectionsBars(sections: Section[]): number {
  if (sections.length === 0) return 0;
  let maxBar = 0;
  for (const section of sections) {
    const end = section.startBar + section.lengthBars;
    if (end > maxBar) maxBar = end;
  }
  return maxBar;
}
