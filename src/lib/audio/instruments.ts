/**
 * Instrument sample configuration.
 *
 * Maps each InstrumentType to its sample source and the specific notes
 * to pre-load. We load every 3rd semitone across the range so Tone.Sampler
 * can pitch-shift between them, keeping total download size small (~600KB
 * per instrument).
 */

import type { InstrumentType } from "@/lib/music/types";

export type SampleSource = "salamander" | "fluidr3";

export interface InstrumentConfig {
  /** Human-readable display name */
  name: string;
  /** Internal type key */
  type: InstrumentType;
  /** Which CDN sample set to pull from */
  sampleSource: SampleSource;
  /** Instrument name in the FluidR3_GM repo (only for fluidr3 source) */
  fluidr3Name?: string;
  /**
   * Notes to load. Every 3rd semitone across octaves 0-7.
   * FluidR3 uses flat notation (Ab, Bb, Db, Eb, Gb).
   */
  sampleNotes: string[];
  /** true if this instrument uses a basic Tone synth instead of samples */
  isSynth?: boolean;
}

/**
 * Every-3rd-semitone note set across the playable range.
 * FluidR3 uses flat notation: Eb, Gb, Ab, Bb, Db
 * Salamander uses sharp notation with "s" suffix: Ds, Fs, Gs, As, Cs
 */
const FLUIDR3_NOTES: string[] = [
  "A0",
  "C1", "Eb1", "Gb1", "A1",
  "C2", "Eb2", "Gb2", "A2",
  "C3", "Eb3", "Gb3", "A3",
  "C4", "Eb4", "Gb4", "A4",
  "C5", "Eb5", "Gb5", "A5",
  "C6", "Eb6", "Gb6", "A6",
  "C7",
];

/**
 * Salamander Grand Piano sample notes.
 * Uses "s" for sharps (Ds = D#, Fs = F#). Available samples confirmed
 * at https://tonejs.github.io/audio/salamander/
 */
const SALAMANDER_NOTES: string[] = [
  "A0",
  "C1", "Ds1", "Fs1", "A1",
  "C2", "Ds2", "Fs2", "A2",
  "C3", "Ds3", "Fs3", "A3",
  "C4", "Ds4", "Fs4", "A4",
  "C5", "Ds5", "Fs5", "A5",
  "C6", "Ds6", "Fs6", "A6",
  "C7",
];

/**
 * Master config map for every InstrumentType.
 */
export const INSTRUMENT_CONFIGS: Record<InstrumentType, InstrumentConfig> = {
  piano: {
    name: "Piano",
    type: "piano",
    sampleSource: "salamander",
    sampleNotes: SALAMANDER_NOTES,
  },
  electric_piano: {
    name: "Electric Piano",
    type: "electric_piano",
    sampleSource: "fluidr3",
    fluidr3Name: "electric_piano_1",
    sampleNotes: FLUIDR3_NOTES,
  },
  bass_electric: {
    name: "Bass (Electric)",
    type: "bass_electric",
    sampleSource: "fluidr3",
    fluidr3Name: "electric_bass_finger",
    sampleNotes: FLUIDR3_NOTES,
  },
  bass_synth: {
    name: "Bass (Synth)",
    type: "bass_synth",
    sampleSource: "fluidr3",
    fluidr3Name: "synth_bass_1",
    sampleNotes: FLUIDR3_NOTES,
  },
  guitar_acoustic: {
    name: "Guitar (Acoustic)",
    type: "guitar_acoustic",
    sampleSource: "fluidr3",
    fluidr3Name: "acoustic_guitar_nylon",
    sampleNotes: FLUIDR3_NOTES,
  },
  guitar_electric: {
    name: "Guitar (Electric)",
    type: "guitar_electric",
    sampleSource: "fluidr3",
    fluidr3Name: "electric_guitar_clean",
    sampleNotes: FLUIDR3_NOTES,
  },
  strings: {
    name: "Strings",
    type: "strings",
    sampleSource: "fluidr3",
    fluidr3Name: "string_ensemble_1",
    sampleNotes: FLUIDR3_NOTES,
  },
  pad: {
    name: "Pad",
    type: "pad",
    sampleSource: "fluidr3",
    fluidr3Name: "pad_2_warm",
    sampleNotes: FLUIDR3_NOTES,
  },
  organ: {
    name: "Organ",
    type: "organ",
    sampleSource: "fluidr3",
    fluidr3Name: "rock_organ",
    sampleNotes: FLUIDR3_NOTES,
  },
  brass: {
    name: "Brass",
    type: "brass",
    sampleSource: "fluidr3",
    fluidr3Name: "brass_section",
    sampleNotes: FLUIDR3_NOTES,
  },
  flute: {
    name: "Flute",
    type: "flute",
    sampleSource: "fluidr3",
    fluidr3Name: "flute",
    sampleNotes: FLUIDR3_NOTES,
  },
  saxophone: {
    name: "Saxophone",
    type: "saxophone",
    sampleSource: "fluidr3",
    fluidr3Name: "alto_sax",
    sampleNotes: FLUIDR3_NOTES,
  },
  drums: {
    name: "Drums",
    type: "drums",
    sampleSource: "fluidr3",
    sampleNotes: [],
    isSynth: true,
  },
  synth: {
    name: "Synth",
    type: "synth",
    sampleSource: "fluidr3",
    sampleNotes: [],
    isSynth: true,
  },
};

/**
 * Build the sample URL map for a given instrument config.
 * Returns a Record<noteName, url> suitable for Tone.Sampler.
 */
/**
 * Convert Salamander "s" notation to standard sharp notation for Tone.Sampler keys.
 * e.g. "Ds4" → "D#4", "Fs3" → "F#3"
 */
function salamanderToStandard(note: string): string {
  return note.replace(/([A-G])s(\d)/, "$1#$2");
}

/**
 * Convert FluidR3 flat notation to standard for Tone.Sampler keys.
 * Tone.Sampler understands both sharps and flats, so Eb = D# etc.
 * We keep the flat notation as-is since Tone handles it.
 */
export function buildSampleUrls(
  config: InstrumentConfig,
): Record<string, string> {
  const urls: Record<string, string> = {};

  for (const note of config.sampleNotes) {
    if (config.sampleSource === "salamander") {
      // Key: standard notation (D#4), URL: salamander notation (Ds4)
      const key = salamanderToStandard(note);
      urls[key] = `https://tonejs.github.io/audio/salamander/${note}.mp3`;
    } else if (config.sampleSource === "fluidr3" && config.fluidr3Name) {
      // FluidR3 uses flat notation which Tone.Sampler understands directly
      urls[note] =
        `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/${config.fluidr3Name}-mp3/${note}.mp3`;
    }
  }

  return urls;
}

/**
 * Ordered list of instrument types for UI dropdowns.
 */
export const INSTRUMENT_OPTIONS: InstrumentType[] = [
  "piano",
  "electric_piano",
  "bass_electric",
  "bass_synth",
  "guitar_acoustic",
  "guitar_electric",
  "strings",
  "pad",
  "organ",
  "brass",
  "flute",
  "saxophone",
  "drums",
  "synth",
];

/**
 * Display labels keyed by InstrumentType.
 */
export const INSTRUMENT_LABELS: Record<InstrumentType, string> =
  Object.fromEntries(
    Object.values(INSTRUMENT_CONFIGS).map((c) => [c.type, c.name]),
  ) as Record<InstrumentType, string>;
