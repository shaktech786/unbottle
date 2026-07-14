/**
 * Build a lightweight signature of the musically-relevant fields of tracks/notes
 * (plus the score-level attributes baked into the exported MusicXML: bpm, key
 * signature, time signature). Used to skip expensive re-renders (MusicXML
 * export + OSMD load + OSMD render) when nothing that affects the rendered
 * score has actually changed, even if the `tracks`/`notes` array references
 * themselves are new (e.g. re-created by a parent/store on unrelated updates).
 */

import type { Note, Track } from "@/lib/music/types";

export function computeContentSignature(
  tracks: Track[],
  notes: Note[],
  bpm: number,
  keySignature: string,
  timeSignature: string,
): string {
  const trackSig = tracks.map((t) => `${t.id}:${t.instrument}:${t.name}`).join("|");
  const noteSig = notes
    .map((n) => `${n.id}:${n.trackId}:${n.pitch}:${n.startTick}:${n.durationTicks}:${n.velocity}`)
    .join("|");
  return `${trackSig}#${noteSig}#${bpm}#${keySignature}#${timeSignature}`;
}
