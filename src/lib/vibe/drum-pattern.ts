/**
 * generateDrumPattern — rule-based 16-step drum pattern from energy + genre.
 * MAIN-53
 *
 * Energy mapping:
 *   1-2 = sparse half-time feel
 *   3   = standard 4/4 (kick 1+3, snare 2+4, closed hats on 8ths)
 *   4-5 = dense with ghost notes and open hats
 */

import {
  createEmptyGrid,
  VOICE_NAMES,
  type DrumGrid,
} from "@/lib/audio/drum-sequencer-engine";

export type { DrumGrid };

/** The full pattern returned from the generator. */
export interface DrumPattern {
  grid: DrumGrid;
  /** Suggested BPM adjustment from the genre/energy (0 = no change). */
  bpmAdjust: number;
}

// Voice index constants matching VOICE_NAMES order
const KICK = VOICE_NAMES.indexOf("kick");
const SNARE = VOICE_NAMES.indexOf("snare");
const HH_CLOSED = VOICE_NAMES.indexOf("hihat_closed");
const HH_OPEN = VOICE_NAMES.indexOf("hihat_open");
const CLAP = VOICE_NAMES.indexOf("clap");
const TOM_HI = VOICE_NAMES.indexOf("tom_hi");
const TOM_LO = VOICE_NAMES.indexOf("tom_lo");
const RIM = VOICE_NAMES.indexOf("rim");

function set(grid: DrumGrid, voice: number, steps: number[]): void {
  for (const s of steps) {
    grid[voice][s] = true;
  }
}

/** Sparse half-time (energy 1–2) */
function patternHalfTime(genre: string): DrumPattern {
  const grid = createEmptyGrid();

  // Kick on 1, snare on 9 (bar 3 in half-time feel)
  set(grid, KICK, [0, 10]);
  set(grid, SNARE, [8]);

  // Sparse closed hats on quarter notes
  set(grid, HH_CLOSED, [0, 4, 8, 12]);

  if (genre.includes("jazz") || genre.includes("soul")) {
    set(grid, RIM, [2, 14]);
  } else if (genre.includes("hip") || genre.includes("trap") || genre.includes("lo-fi")) {
    // Extra kick for lo-fi feel
    set(grid, KICK, [6]);
    set(grid, HH_CLOSED, [2, 6, 10, 14]);
  }

  return { grid, bpmAdjust: 0 };
}

/** Standard 4/4 groove (energy 3) */
function patternStandard4_4(genre: string): DrumPattern {
  const grid = createEmptyGrid();

  // Kick: 1, 3 (beats 1 and 3)
  set(grid, KICK, [0, 8]);
  // Snare: 2, 4 (beats 2 and 4)
  set(grid, SNARE, [4, 12]);
  // Closed hats on every 8th note
  set(grid, HH_CLOSED, [0, 2, 4, 6, 8, 10, 12, 14]);

  if (genre.includes("rock") || genre.includes("punk")) {
    // Kick on beat 3 too, ride hits
    set(grid, KICK, [6, 10]);
  } else if (genre.includes("funk") || genre.includes("soul")) {
    // Kick syncopation
    set(grid, KICK, [3, 10]);
    set(grid, CLAP, [4, 12]);
  } else if (genre.includes("house") || genre.includes("techno")) {
    // 4-on-the-floor
    set(grid, KICK, [0, 4, 8, 12]);
    set(grid, HH_OPEN, [6, 14]);
  }

  return { grid, bpmAdjust: 0 };
}

/** Dense with ghost notes (energy 4–5) */
function patternDense(genre: string, energy: 4 | 5): DrumPattern {
  const grid = createEmptyGrid();

  // Strong kick pattern
  set(grid, KICK, [0, 3, 8, 12]);
  if (energy === 5) {
    set(grid, KICK, [6, 14]);
  }

  // Snare + clap together for punch
  set(grid, SNARE, [4, 12]);
  set(grid, CLAP, [4, 12]);

  // Closed hats on 16ths
  set(grid, HH_CLOSED, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  // Open hats on off-beats
  set(grid, HH_OPEN, [2, 10]);

  // Ghost notes on snare for humanization
  if (energy === 5) {
    grid[SNARE][2] = true;
    grid[SNARE][7] = true;
    grid[SNARE][14] = true;
  } else {
    grid[SNARE][6] = true;
  }

  if (genre.includes("dnb") || genre.includes("drum and bass")) {
    // Amen break-style — kick on 0, snare on 4+10
    const freshGrid = createEmptyGrid();
    set(freshGrid, KICK, [0, 3]);
    set(freshGrid, SNARE, [4, 10, 12]);
    set(freshGrid, HH_CLOSED, [0, 2, 4, 6, 8, 10, 12, 14]);
    set(freshGrid, HH_OPEN, [6, 14]);
    return { grid: freshGrid, bpmAdjust: 0 };
  }

  if (genre.includes("trap")) {
    // Hi-hat rolls on 16ths, kick doubles
    set(grid, TOM_HI, [7]);
    set(grid, TOM_LO, [15]);
  }

  return { grid, bpmAdjust: 0 };
}

/**
 * Generate a 16-step drum pattern based on energy level and genre.
 *
 * @param energy  1–5 energy level
 * @param genre   Genre string (case-insensitive match used internally)
 * @returns DrumPattern compatible with DrumSequencerEngine
 */
export function generateDrumPattern(energy: 1 | 2 | 3 | 4 | 5, genre: string): DrumPattern {
  const g = genre.toLowerCase();

  if (energy <= 2) return patternHalfTime(g);
  if (energy === 3) return patternStandard4_4(g);
  return patternDense(g, energy as 4 | 5);
}
