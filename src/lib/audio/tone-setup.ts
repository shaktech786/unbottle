import type { InstrumentType } from "@/lib/music/types";

type ToneModule = typeof import("tone");

let toneModule: ToneModule | null = null;
let audioInitialized = false;

/**
 * Lazy-load Tone.js (client-only module).
 * Returns the full Tone namespace.
 */
async function loadTone(): Promise<ToneModule> {
  if (toneModule) return toneModule;
  toneModule = await import("tone");
  return toneModule;
}

/**
 * Initialize the audio context on a user gesture.
 * Must be called from a click/tap/keydown handler to satisfy
 * the browser autoplay policy.
 */
export async function initAudio(): Promise<void> {
  if (audioInitialized) return;

  const Tone = await loadTone();
  await Tone.start();
  audioInitialized = true;
}

/**
 * Whether `initAudio` has been called successfully.
 */
export function isAudioReady(): boolean {
  return audioInitialized;
}

/**
 * Returns the global Transport (lazy-loaded).
 */
export async function getTransport() {
  const Tone = await loadTone();
  return Tone.getTransport();
}

/**
 * Factory that returns a connected Tone synth for the given instrument type.
 * The synth is automatically connected to the master output.
 */
export async function createInstrument(type: InstrumentType) {
  const Tone = await loadTone();
  const dest = Tone.getDestination();

  switch (type) {
    case "synth":
      return new Tone.Synth().connect(dest);
    case "am_synth":
      return new Tone.AMSynth().connect(dest);
    case "fm_synth":
      return new Tone.FMSynth().connect(dest);
    case "membrane_synth":
      return new Tone.MembraneSynth().connect(dest);
    case "metal_synth":
      return new Tone.MetalSynth().connect(dest);
    case "mono_synth":
      return new Tone.MonoSynth().connect(dest);
    case "pluck_synth":
      return new Tone.PluckSynth().connect(dest);
    case "poly_synth":
      return new Tone.PolySynth().connect(dest);
    case "sampler":
      // Sampler requires buffers; fall back to a basic synth for MVP.
      return new Tone.Synth().connect(dest);
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown instrument type: ${_exhaustive}`);
    }
  }
}

/**
 * Returns the raw Tone module for advanced use.
 */
export { loadTone };
