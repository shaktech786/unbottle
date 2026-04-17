/**
 * Offline audio renderer.
 *
 * Uses Tone.Offline() with the same Sampler instruments as live playback
 * to render a session's notes into a WAV Blob. Produces audio that matches
 * what the user hears during live playback.
 */

import type { Note, Track } from "@/lib/music/types";
import { ticksToSeconds } from "@/lib/music/types";
import { float32ToWav } from "./wav-encoder";
import { INSTRUMENT_CONFIGS, buildSampleUrls } from "./instruments";
import { routeNotesToTracks } from "./note-router";

/**
 * Render all session notes to a WAV audio Blob using Tone.Offline().
 * Loads the same CDN samples used during live playback so the exported
 * audio matches what the user hears.
 *
 * @param notes           - All notes in the session
 * @param tracks          - All tracks (for instrument type, volume, pan, mute/solo)
 * @param bpm             - Tempo in beats per minute
 * @param durationSeconds - Total render duration in seconds
 * @param onProgress      - Optional callback reporting progress 0-100
 * @returns WAV Blob
 */
export async function renderSessionToAudio(
  notes: Note[],
  tracks: Track[],
  bpm: number,
  durationSeconds: number,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const safeDuration = Math.max(0.1, durationSeconds);

  onProgress?.(0);

  // Tone.js is a client-only ESM module
  const Tone = await import("tone");

  onProgress?.(5);

  // Route notes (respects mute/solo semantics)
  const routed = routeNotesToTracks(notes, tracks);

  const trackById = new Map<string, Track>();
  for (const track of tracks) trackById.set(track.id, track);

  onProgress?.(10);

  // Tone.Offline temporarily replaces the global audio context with an
  // OfflineContext, so all new Tone nodes are created there automatically.
  const toneBuffer = await Tone.Offline(async ({ transport }) => {
    transport.bpm.value = bpm;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instrumentMap = new Map<string, any>();
    const loadPromises: Promise<void>[] = [];

    for (const [trackId, routedTrack] of routed) {
      const track = trackById.get(trackId);
      if (!track) continue;

      const config = INSTRUMENT_CONFIGS[routedTrack.instrument];
      const volumeDb =
        track.volume > 0 ? 20 * Math.log10(track.volume) : -Infinity;
      const channel = new Tone.Channel({
        volume: volumeDb,
        pan: track.pan,
      }).toDestination();

      if (config.isSynth) {
        const instrument =
          routedTrack.instrument === "drums"
            ? new Tone.MembraneSynth()
            : new Tone.PolySynth(Tone.Synth);
        instrument.connect(channel);
        instrumentMap.set(trackId, instrument);
      } else {
        const urls = buildSampleUrls(config);

        const prom = new Promise<void>((resolve) => {
          const sampler = new Tone.Sampler({
            urls,
            onload: () => {
              instrumentMap.set(trackId, sampler);
              resolve();
            },
            onerror: () => {
              // Disconnect the failed sampler before creating the fallback
              try { sampler.disconnect(); } catch { /* ignore */ }
              const fallback = new Tone.PolySynth(Tone.Synth);
              fallback.connect(channel);
              instrumentMap.set(trackId, fallback);
              resolve();
            },
          }).connect(channel);
        });

        loadPromises.push(prom);
      }
    }

    // Wait for all samplers to finish loading from CDN
    await Promise.all(loadPromises);

    onProgress?.(60);

    // Schedule notes onto the offline transport
    for (const [trackId, { notes: trackNotes }] of routed) {
      const instrument = instrumentMap.get(trackId);
      if (!instrument) continue;

      for (const note of trackNotes) {
        const startSec = ticksToSeconds(note.startTick, bpm);
        if (startSec >= safeDuration) continue;

        const durationSec = Math.min(
          ticksToSeconds(note.durationTicks, bpm),
          safeDuration - startSec,
        );

        transport.schedule((time: number) => {
          try {
            instrument.triggerAttackRelease(
              note.pitch,
              durationSec,
              time,
              note.velocity / 127,
            );
          } catch {
            // Ignore individual note errors (e.g. unsupported pitch for drums)
          }
        }, startSec);
      }
    }

    transport.start(0);
  }, safeDuration, 2, 44100);

  onProgress?.(80);

  // ToneAudioBuffer wraps a standard AudioBuffer — extract channel data
  const rawBuffer = toneBuffer.get();
  if (!rawBuffer) throw new Error("Offline render produced no audio");

  const left = rawBuffer.getChannelData(0);
  const right =
    rawBuffer.numberOfChannels > 1 ? rawBuffer.getChannelData(1) : left;

  // Interleave L/R into a single Float32Array for the WAV encoder
  const interleaved = new Float32Array(left.length * 2);
  for (let i = 0; i < left.length; i++) {
    interleaved[i * 2] = left[i];
    interleaved[i * 2 + 1] = right[i];
  }

  onProgress?.(90);

  const wavBlob = float32ToWav(interleaved, 44100, 2);

  onProgress?.(100);

  return wavBlob;
}
