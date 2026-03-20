import type { InstrumentType } from "@/lib/music/types";
import { INSTRUMENT_CONFIGS, buildSampleUrls } from "./instruments";

type ToneModule = typeof import("tone");

let toneModule: ToneModule | null = null;
let audioInitialized = false;

/**
 * Cache of loaded Tone.Sampler instances keyed by InstrumentType.
 * Prevents re-downloading samples when switching back to an instrument.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const samplerCache = new Map<InstrumentType, any>();

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
 * Callback shape for reporting sample loading progress.
 */
export type LoadingCallback = (loading: boolean) => void;

/**
 * Factory that returns a connected Tone instrument for the given type.
 *
 * - For sample-based instruments: creates a `Tone.Sampler` that loads
 *   every 3rd semitone from the appropriate CDN. Returns a promise that
 *   resolves once all samples are buffered.
 * - For "synth" and "drums": returns a basic Tone synth immediately.
 * - Loaded samplers are cached so switching instruments back won't re-download.
 *
 * @param type - The InstrumentType to create
 * @param onLoading - Optional callback fired with true when loading starts, false when done
 */
export async function createInstrument(
  type: InstrumentType,
  onLoading?: LoadingCallback,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const Tone = await loadTone();
  const dest = Tone.getDestination();
  const config = INSTRUMENT_CONFIGS[type];

  // Synth-based instruments (drums, basic synth) -- no samples needed
  if (config.isSynth) {
    if (type === "drums") {
      return new Tone.MembraneSynth().connect(dest);
    }
    return new Tone.Synth().connect(dest);
  }

  // Check the cache first
  const cached = samplerCache.get(type);
  if (cached) {
    // Reconnect in case it was disconnected
    if (!cached.disposed) {
      cached.connect(dest);
      return cached;
    }
    // Was disposed; remove stale entry
    samplerCache.delete(type);
  }

  // Build sample URL map
  const urls = buildSampleUrls(config);

  if (Object.keys(urls).length === 0) {
    // No URLs resolved (misconfiguration) -- fall back to basic synth
    return new Tone.Synth().connect(dest);
  }

  // Signal loading start
  onLoading?.(true);

  // Create Tone.Sampler and wait for all samples to load
  const sampler = await new Promise<InstanceType<typeof Tone.Sampler>>(
    (resolve, reject) => {
      const timeoutMs = 30_000;
      const timer = setTimeout(() => {
        reject(new Error(`Sample loading timed out for instrument: ${type}`));
      }, timeoutMs);

      const s = new Tone.Sampler({
        urls,
        onload: () => {
          clearTimeout(timer);
          resolve(s);
        },
        onerror: (err: Error) => {
          clearTimeout(timer);
          reject(err);
        },
      }).connect(dest);
    },
  ).catch(() => {
    // Fallback to basic synth on any load failure
    return new Tone.Synth().connect(dest) as unknown as InstanceType<
      typeof Tone.Sampler
    >;
  });

  // Signal loading done
  onLoading?.(false);

  // Cache for reuse
  samplerCache.set(type, sampler);

  return sampler;
}

/**
 * Dispose and remove a cached sampler for the given type.
 */
export function disposeCachedInstrument(type: InstrumentType): void {
  const cached = samplerCache.get(type);
  if (cached?.dispose) {
    cached.dispose();
  }
  samplerCache.delete(type);
}

/**
 * Returns the raw Tone module for advanced use.
 */
export { loadTone };
