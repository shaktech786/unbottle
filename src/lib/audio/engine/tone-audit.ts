/**
 * Tone.js call-site inventory (MAIN-161 audit output)
 *
 * Files that import or use Tone.js:
 *
 * 1. src/lib/audio/tone-setup.ts
 *    - loadTone() — lazy import("tone")
 *    - initAudio() — Tone.start()
 *    - getTransport() — Tone.getTransport()
 *    - createInstrument() — Tone.Sampler, Tone.MembraneSynth, Tone.PolySynth, Tone.Synth
 *    - Tone.getDestination() for routing
 *
 * 2. src/lib/hooks/use-tone-player.ts
 *    - import("tone") in useEffect
 *    - Tone.getTransport() — bpm, PPQ, start/stop/schedule/clear/cancel/position/loop
 *    - Tone.Channel — volume, pan routing
 *    - Tone.start() — AudioContext resume
 *    - instrument.triggerAttackRelease() — playback scheduling
 *    - requestAnimationFrame for playhead tracking
 *
 * 3. src/lib/audio/offline-renderer.ts
 *    - Tone.Offline() — OfflineAudioContext render
 *    - Tone.Channel — per-track bus
 *    - Tone.MembraneSynth, Tone.PolySynth, Tone.Synth, Tone.Sampler
 *    - toneBuffer.get() — raw AudioBuffer extraction
 *
 * Migration strategy:
 *   - Replace Tone.Channel with native GainNode + StereoPannerNode
 *   - Replace Tone.Transport scheduling with a custom clock (AudioContext.currentTime)
 *   - Replace Tone.Sampler/Synth references in offline-renderer with the new
 *     native MixerNode (see graph-design.ts)
 *   - Keep Tone.Sampler sample loading until native sampler is built (MAIN-164)
 */

export const TONE_CALL_SITES = [
  "src/lib/audio/tone-setup.ts",
  "src/lib/hooks/use-tone-player.ts",
  "src/lib/audio/offline-renderer.ts",
] as const;
