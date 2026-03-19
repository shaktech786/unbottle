import type { Pitch, NoteName, Octave } from "@/lib/music/types";

export interface DetectedNote {
  pitch: Pitch;
  start: number; // seconds
  duration: number; // seconds
}

const NOTE_NAMES: NoteName[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/**
 * Convert a frequency (Hz) to the closest MIDI note name.
 * Uses A4 = 440 Hz as the reference pitch.
 */
function frequencyToNote(frequency: number): { pitch: Pitch; cents: number } {
  const midiNumber = 12 * Math.log2(frequency / 440) + 69;
  const roundedMidi = Math.round(midiNumber);
  const cents = Math.round((midiNumber - roundedMidi) * 100);

  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const clampedOctave = Math.max(0, Math.min(8, octave)) as Octave;

  const noteName = NOTE_NAMES[noteIndex];
  const pitch = `${noteName}${clampedOctave}` as Pitch;

  return { pitch, cents };
}

/**
 * Autocorrelation-based pitch detection on a single analysis window.
 * Returns the detected frequency in Hz, or null if no clear pitch is found.
 */
function autoCorrelate(
  buffer: Float32Array,
  sampleRate: number,
): number | null {
  const size = buffer.length;

  // Check signal level -- skip silent frames
  let rms = 0;
  for (let i = 0; i < size; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return null; // too quiet

  // Normalize
  const normalized = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    normalized[i] = buffer[i];
  }

  // Autocorrelation
  const correlations = new Float32Array(size);
  for (let lag = 0; lag < size; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) {
      sum += normalized[i] * normalized[i + lag];
    }
    correlations[lag] = sum;
  }

  // Find the first dip then the next peak after it.
  // The lag of that peak corresponds to the fundamental period.
  let d = 0;
  // Walk past the initial peak (lag 0)
  while (d < size - 1 && correlations[d] > correlations[d + 1]) {
    d++;
  }

  let maxVal = -Infinity;
  let maxLag = -1;
  for (let i = d; i < size; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxLag = i;
    }
  }

  if (maxLag === -1 || maxVal < 0.1 * correlations[0]) {
    return null; // no confident pitch found
  }

  // Parabolic interpolation for sub-sample accuracy
  const prev = correlations[maxLag - 1] ?? 0;
  const curr = correlations[maxLag];
  const next = correlations[maxLag + 1] ?? 0;
  const shift = (prev - next) / (2 * (prev - 2 * curr + next));
  const refinedLag = maxLag + (Number.isFinite(shift) ? shift : 0);

  return sampleRate / refinedLag;
}

/**
 * Detect pitched notes from an AudioBuffer.
 *
 * Splits the audio into overlapping windows and runs autocorrelation
 * on each window. Adjacent windows that yield the same pitch are
 * merged into a single DetectedNote.
 *
 * @param audioBuffer - Decoded audio data
 * @param windowSizeMs - Analysis window size in milliseconds (default 50ms)
 * @param hopSizeMs - Hop between windows in milliseconds (default 25ms)
 */
export function detectPitch(
  audioBuffer: AudioBuffer,
  windowSizeMs = 50,
  hopSizeMs = 25,
): DetectedNote[] {
  const sampleRate = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0); // mono mix
  const windowSize = Math.floor((windowSizeMs / 1000) * sampleRate);
  const hopSize = Math.floor((hopSizeMs / 1000) * sampleRate);

  const rawDetections: { pitch: Pitch; time: number }[] = [];

  for (let offset = 0; offset + windowSize <= data.length; offset += hopSize) {
    const window = data.subarray(offset, offset + windowSize);
    const freq = autoCorrelate(window, sampleRate);
    if (freq !== null && freq >= 20 && freq <= 5000) {
      const { pitch } = frequencyToNote(freq);
      rawDetections.push({
        pitch,
        time: offset / sampleRate,
      });
    }
  }

  // Merge consecutive detections of the same pitch
  const notes: DetectedNote[] = [];
  let current: { pitch: Pitch; start: number; end: number } | null = null;

  for (const det of rawDetections) {
    if (current && current.pitch === det.pitch) {
      current.end = det.time + windowSizeMs / 1000;
    } else {
      if (current) {
        notes.push({
          pitch: current.pitch,
          start: current.start,
          duration: current.end - current.start,
        });
      }
      current = {
        pitch: det.pitch,
        start: det.time,
        end: det.time + windowSizeMs / 1000,
      };
    }
  }

  if (current) {
    notes.push({
      pitch: current.pitch,
      start: current.start,
      duration: current.end - current.start,
    });
  }

  // Filter out very short detections (likely noise)
  return notes.filter((n) => n.duration >= 0.05);
}
