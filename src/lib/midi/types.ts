/**
 * MIDI-specific type definitions.
 * Re-exports relevant types from the core music domain.
 */
export type {
  Note,
  Track,
  Pitch,
  NoteName,
  Octave,
  InstrumentType,
  Session,
} from "@/lib/music/types";

export { PPQ, ticksToSeconds, barsToTicks } from "@/lib/music/types";

/** Options for MIDI export. */
export interface MidiExportOptions {
  /** Tracks to include. If omitted, all tracks are exported. */
  trackIds?: string[];
  /** Whether to include a tempo track (track 0). Default true. */
  includeTempoTrack?: boolean;
}

/** Maps an internal InstrumentType to a General MIDI program number. */
export const INSTRUMENT_PROGRAM_MAP: Record<string, number> = {
  synth: 81, // Lead 2 (sawtooth)
  am_synth: 82, // Lead 3 (calliope)
  fm_synth: 80, // Lead 1 (square)
  membrane_synth: 118, // Synth Drum
  metal_synth: 14, // Tubular Bells (close enough)
  mono_synth: 81,
  pluck_synth: 25, // Acoustic Guitar (nylon)
  poly_synth: 89, // Pad 2 (warm)
  sampler: 0, // Acoustic Grand Piano (default)
};
