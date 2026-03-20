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

/** Maps an internal InstrumentType to a General MIDI program number (0-indexed). */
export const INSTRUMENT_PROGRAM_MAP: Record<string, number> = {
  piano: 0,           // Acoustic Grand Piano
  electric_piano: 4,  // Electric Piano 1
  bass_electric: 33,  // Electric Bass (finger)
  bass_synth: 38,     // Synth Bass 1
  guitar_acoustic: 24, // Acoustic Guitar (nylon)
  guitar_electric: 27, // Electric Guitar (clean)
  strings: 48,        // String Ensemble 1
  pad: 89,            // Pad 2 (warm)
  organ: 18,          // Rock Organ
  brass: 61,          // Brass Section
  flute: 73,          // Flute
  saxophone: 65,      // Alto Sax
  drums: 118,         // Synth Drum (channel 10 in practice)
  synth: 81,          // Lead 2 (sawtooth)
  // Legacy mappings for old DB values
  am_synth: 81,
  fm_synth: 4,
  membrane_synth: 118,
  metal_synth: 14,
  mono_synth: 38,
  pluck_synth: 24,
  poly_synth: 89,
  sampler: 0,
};
