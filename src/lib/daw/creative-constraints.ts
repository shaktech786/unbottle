/**
 * Creative constraint pool for "Constrain me" mode.
 * Generates a random limitation to spark creativity.
 */

export interface CreativeConstraint {
  id: string;
  text: string;
  /** Higher weight = more likely to be selected */
  weight: number;
}

export const CONSTRAINT_POOL: CreativeConstraint[] = [
  { id: "c01", text: "Only use 3 notes", weight: 1 },
  { id: "c02", text: "No kick drum", weight: 1 },
  { id: "c03", text: "BPM must be 93", weight: 1 },
  { id: "c04", text: "Only use samples you could record in 60 seconds right now", weight: 1 },
  { id: "c05", text: "Every track must start at bar 3 or later", weight: 1 },
  { id: "c06", text: "No notes below middle C", weight: 1 },
  { id: "c07", text: "Use only a minor pentatonic scale", weight: 1 },
  { id: "c08", text: "Maximum 2 tracks total", weight: 1 },
  { id: "c09", text: "No snare or clap", weight: 1 },
  { id: "c10", text: "All clips must be exactly 2 bars long", weight: 1 },
  { id: "c11", text: "Only use whole notes — no rhythm under a half note", weight: 1 },
  { id: "c12", text: "The track must loop perfectly in 8 bars", weight: 1 },
  { id: "c13", text: "Use exactly 4 chords, no more", weight: 1 },
  { id: "c14", text: "No bass frequencies — keep everything above 200 Hz", weight: 1 },
  { id: "c15", text: "Everything must sound like it came from one instrument", weight: 1 },
  { id: "c16", text: "Use a tempo you would never normally choose", weight: 1 },
  { id: "c17", text: "Melodic elements only — no percussion at all", weight: 1 },
  { id: "c18", text: "Start with silence for the first 4 beats", weight: 1 },
  { id: "c19", text: "Only use notes from the C major scale", weight: 1 },
  { id: "c20", text: "No chord voicings — single notes only", weight: 1 },
  { id: "c21", text: "The whole track must be under 60 seconds", weight: 1 },
  { id: "c22", text: "Use an odd time signature (5/4, 7/8, or 9/8)", weight: 1 },
  { id: "c23", text: "Every element must enter and exit with a fade", weight: 1 },
  { id: "c24", text: "Finish the entire idea in 10 minutes", weight: 1 },
  { id: "c25", text: "No copy-paste — every clip must be manually placed", weight: 1 },
];

/**
 * Select a random constraint from the pool using weighted random selection.
 * Excludes the currently active constraint to avoid repeats.
 */
export function pickRandomConstraint(excludeId?: string): CreativeConstraint {
  const pool = excludeId
    ? CONSTRAINT_POOL.filter((c) => c.id !== excludeId)
    : CONSTRAINT_POOL;

  // Weighted random
  const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const constraint of pool) {
    rand -= constraint.weight;
    if (rand <= 0) return constraint;
  }
  return pool[pool.length - 1];
}
