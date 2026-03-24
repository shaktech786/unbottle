/**
 * Offline audio renderer.
 *
 * Uses OfflineAudioContext + basic oscillator-based synthesis to render
 * a session's notes into a WAV Blob. This runs entirely in the browser
 * without needing Tone.js or network-loaded samples.
 */

import type { Note, Track, InstrumentType } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";
import { float32ToWav } from "./wav-encoder";

/**
 * Map instrument types to basic Web Audio oscillator waveforms.
 * These are rough approximations — the goal is a quick offline bounce,
 * not a studio-quality render.
 */
const INSTRUMENT_WAVEFORM: Record<InstrumentType, OscillatorType> = {
  piano: "triangle",
  electric_piano: "triangle",
  bass_electric: "sawtooth",
  bass_synth: "sawtooth",
  guitar_acoustic: "triangle",
  guitar_electric: "square",
  strings: "sine",
  pad: "sine",
  organ: "square",
  brass: "sawtooth",
  flute: "sine",
  saxophone: "sawtooth",
  drums: "square",
  synth: "square",
};

/**
 * Convert a pitch string like "C4" or "D#5" to frequency in Hz.
 * Uses equal temperament with A4 = 440 Hz.
 */
function pitchToFrequency(pitch: string): number {
  const match = pitch.match(/^([A-G]#?)(\d)$/);
  if (!match) return 440;

  const noteMap: Record<string, number> = {
    C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
    "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
  };

  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const semitone = noteMap[noteName] ?? 9;

  // MIDI note number: C4 = 60, A4 = 69
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Render all session notes to a WAV audio Blob using OfflineAudioContext.
 *
 * @param notes           - All notes in the session
 * @param tracks          - All tracks (for instrument type, volume, mute state)
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
  const sampleRate = 44100;
  const numChannels = 2; // stereo

  // Ensure at least 0.1s to avoid 0-length context
  const safeDuration = Math.max(0.1, durationSeconds);
  const totalSamples = Math.ceil(safeDuration * sampleRate);

  onProgress?.(0);

  const offlineCtx = new OfflineAudioContext(numChannels, totalSamples, sampleRate);

  // Build track lookup
  const trackMap = new Map<string, Track>();
  for (const track of tracks) {
    trackMap.set(track.id, track);
  }

  // Determine which tracks are active (respect mute/solo)
  const hasSolo = tracks.some((t) => t.solo);
  const activeTracks = new Set<string>();
  for (const track of tracks) {
    if (hasSolo) {
      if (track.solo) activeTracks.add(track.id);
    } else {
      if (!track.muted) activeTracks.add(track.id);
    }
  }

  // Seconds per tick
  const secondsPerTick = (60 / bpm) / PPQ;

  onProgress?.(10);

  // Schedule each note as an oscillator
  let scheduled = 0;
  const totalNotes = notes.length;

  for (const note of notes) {
    const track = trackMap.get(note.trackId);
    if (!track || !activeTracks.has(note.trackId)) continue;

    const startTime = note.startTick * secondsPerTick;
    const duration = note.durationTicks * secondsPerTick;

    // Skip notes that fall outside the render window
    if (startTime >= safeDuration) continue;
    const clampedDuration = Math.min(duration, safeDuration - startTime);

    const frequency = pitchToFrequency(note.pitch);
    const waveform = INSTRUMENT_WAVEFORM[track.instrument] ?? "sine";

    // Create oscillator for this note
    const oscillator = offlineCtx.createOscillator();
    oscillator.type = waveform;
    oscillator.frequency.value = frequency;

    // Gain node for volume envelope
    const gainNode = offlineCtx.createGain();

    // Base volume from velocity (0-127) and track volume (0-1)
    const velocityGain = (note.velocity / 127) * track.volume;
    // Scale down to avoid clipping with many simultaneous notes
    const masterGain = velocityGain * 0.15;

    // Simple ADSR-ish envelope: quick attack, sustain, short release
    const attackTime = 0.005;
    const releaseTime = Math.min(0.05, clampedDuration * 0.1);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(masterGain, startTime + attackTime);
    gainNode.gain.setValueAtTime(masterGain, startTime + clampedDuration - releaseTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + clampedDuration);

    // Stereo panning
    const panner = offlineCtx.createStereoPanner();
    panner.pan.value = track.pan;

    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(offlineCtx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + clampedDuration);

    scheduled++;
    if (totalNotes > 0 && scheduled % 50 === 0) {
      onProgress?.(10 + Math.round((scheduled / totalNotes) * 40));
    }
  }

  onProgress?.(50);

  // Render
  const audioBuffer = await offlineCtx.startRendering();

  onProgress?.(80);

  // Interleave stereo channels into a single Float32Array
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.numberOfChannels > 1
    ? audioBuffer.getChannelData(1)
    : left;

  const interleaved = new Float32Array(left.length * 2);
  for (let i = 0; i < left.length; i++) {
    interleaved[i * 2] = left[i];
    interleaved[i * 2 + 1] = right[i];
  }

  onProgress?.(90);

  // Encode to WAV
  const wavBlob = float32ToWav(interleaved, sampleRate, numChannels);

  onProgress?.(100);

  return wavBlob;
}
