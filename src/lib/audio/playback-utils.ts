import type { Note, Section } from "@/lib/music/types";
import { barsToTicks } from "@/lib/music/types";

/**
 * Returns the tick position where the last note ends (startTick + durationTicks).
 * Returns 0 for an empty notes array.
 */
export function calculateEndTick(notes: Note[]): number {
  if (notes.length === 0) return 0;
  let max = 0;
  for (const note of notes) {
    const end = note.startTick + note.durationTicks;
    if (end > max) max = end;
  }
  return max;
}

/**
 * Returns the start and end tick positions for a given section,
 * calculated from its startBar and lengthBars using the time signature.
 */
export function getSectionTickRange(
  section: Section,
  timeSignature: string,
): { startTick: number; endTick: number } {
  const startTick = barsToTicks(section.startBar, timeSignature);
  const endTick = barsToTicks(section.startBar + section.lengthBars, timeSignature);
  return { startTick, endTick };
}

/**
 * Copies notes within a source tick range and offsets them to a target section's start tick.
 * Optionally reassigns trackId. Returns notes without IDs (caller generates IDs).
 *
 * Notes at the exact startTick boundary are included; notes at endTick boundary are excluded.
 */
export function copyNotesForSection(
  notes: Note[],
  sourceSectionStartTick: number,
  sourceSectionEndTick: number,
  targetSectionStartTick: number,
  newTrackId?: string,
): Omit<Note, "id">[] {
  return notes
    .filter(
      (n) =>
        n.startTick >= sourceSectionStartTick &&
        n.startTick < sourceSectionEndTick,
    )
    .map((n) => {
      const offset = n.startTick - sourceSectionStartTick + targetSectionStartTick;
      return {
        trackId: newTrackId ?? n.trackId,
        sectionId: n.sectionId,
        pitch: n.pitch,
        startTick: offset,
        durationTicks: n.durationTicks,
        velocity: n.velocity,
      };
    });
}
