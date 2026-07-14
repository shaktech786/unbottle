/**
 * MAIN-32 — Audio feature extraction for style profile ingestion.
 *
 * `analyzeAudioFeatures` runs entirely in-process (no external deps):
 *  - BPM via beat detection (onset energy peaks in RMS windows)
 *  - Key via pitch class histogram + major/minor profile correlation
 */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// ---------------------------------------------------------------------------
// BPM detection
// ---------------------------------------------------------------------------

/**
 * Simple onset-strength BPM estimator.
 * Splits the signal into ~23ms windows and tracks energy rises (onsets).
 * Then finds the most common inter-onset interval.
 */
function detectBpm(buffer: AudioBuffer): number {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);

  const windowSize = Math.floor(sampleRate * 0.023); // ~23ms
  const hopSize = Math.floor(windowSize / 2);

  let prevEnergy = 0;
  const onsetTimes: number[] = [];

  for (let offset = 0; offset + windowSize <= data.length; offset += hopSize) {
    let energy = 0;
    for (let i = offset; i < offset + windowSize; i++) {
      energy += data[i] * data[i];
    }
    energy /= windowSize;

    // Onset: significant energy increase
    if (energy > prevEnergy * 1.5 && energy > 0.001) {
      const timeMs = (offset / sampleRate) * 1000;
      onsetTimes.push(timeMs);
    }
    prevEnergy = energy;
  }

  if (onsetTimes.length < 4) {
    // Too few onsets — return a safe fallback
    return 120;
  }

  // Compute inter-onset intervals
  const intervals: number[] = [];
  for (let i = 1; i < onsetTimes.length; i++) {
    const iv = onsetTimes[i] - onsetTimes[i - 1];
    if (iv > 200 && iv < 2000) intervals.push(iv); // 30–300 BPM window
  }

  if (intervals.length === 0) return 120;

  // Cluster intervals into BPM candidates using histogram
  const bpmBuckets: Record<number, number> = {};
  for (const iv of intervals) {
    const bpm = Math.round(60000 / iv);
    const key = Math.round(bpm / 5) * 5; // 5-BPM bucket
    bpmBuckets[key] = (bpmBuckets[key] ?? 0) + 1;
  }

  let bestBpm = 120;
  let bestCount = 0;
  for (const [bpmStr, count] of Object.entries(bpmBuckets)) {
    if (count > bestCount) {
      bestCount = count;
      bestBpm = Number(bpmStr);
    }
  }

  return Math.max(40, Math.min(300, bestBpm));
}

// ---------------------------------------------------------------------------
// Key detection via Krumhansl-Schmuckler pitch class profiles
// ---------------------------------------------------------------------------

// Major and minor key profiles (Krumhansl 1990)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * Build a 12-bin pitch class histogram from the audio by running
 * a simplified FFT-based approach: sample frequency magnitudes at
 * each pitch class's fundamental frequency.
 */
function buildPitchClassHistogram(buffer: AudioBuffer): Float32Array {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);

  // Use a reasonably sized FFT window (~100ms)
  const fftSize = 4096;
  const numWindows = Math.floor(data.length / fftSize);

  const histogram = new Float32Array(12);

  for (let w = 0; w < numWindows; w++) {
    const offset = w * fftSize;
    const window = data.subarray(offset, offset + fftSize);

    // Compute simple magnitude spectrum via DFT on key frequency bins
    for (let pc = 0; pc < 12; pc++) {
      // Average across 3 octaves (C3..C5 range)
      let magnitude = 0;
      for (let octave = 3; octave <= 5; octave++) {
        // MIDI note for this pitch class at this octave
        const midiNote = pc + (octave + 1) * 12;
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        const bin = Math.round((freq * fftSize) / sampleRate);

        // Correlate with a complex sinusoid at this bin
        let re = 0;
        let im = 0;
        // Sample every 4th sample to keep this fast
        for (let i = 0; i < fftSize; i += 4) {
          const phase = (2 * Math.PI * bin * i) / fftSize;
          re += window[i] * Math.cos(phase);
          im += window[i] * Math.sin(phase);
        }
        magnitude += Math.sqrt(re * re + im * im);
      }
      histogram[pc] += magnitude / 3;
    }
  }

  // Normalize
  let maxVal = 0;
  for (let i = 0; i < 12; i++) if (histogram[i] > maxVal) maxVal = histogram[i];
  if (maxVal > 0) for (let i = 0; i < 12; i++) histogram[i] /= maxVal;

  return histogram;
}

function correlate(histogram: Float32Array, profile: number[], shift: number): number {
  // Pearson correlation
  const n = 12;
  let sumH = 0, sumP = 0;
  for (let i = 0; i < n; i++) {
    sumH += histogram[i];
    sumP += profile[(i + shift) % n];
  }
  const meanH = sumH / n;
  const meanP = sumP / n;

  let num = 0, denH = 0, denP = 0;
  for (let i = 0; i < n; i++) {
    const dh = histogram[i] - meanH;
    const dp = profile[(i + shift) % n] - meanP;
    num += dh * dp;
    denH += dh * dh;
    denP += dp * dp;
  }

  const denom = Math.sqrt(denH * denP);
  return denom === 0 ? 0 : num / denom;
}

function detectKey(histogram: Float32Array): string {
  let bestCorr = -Infinity;
  let bestKey = "C major";

  for (let pc = 0; pc < 12; pc++) {
    const majorCorr = correlate(histogram, MAJOR_PROFILE, pc);
    if (majorCorr > bestCorr) {
      bestCorr = majorCorr;
      bestKey = `${NOTE_NAMES[pc]} major`;
    }

    const minorCorr = correlate(histogram, MINOR_PROFILE, pc);
    if (minorCorr > bestCorr) {
      bestCorr = minorCorr;
      bestKey = `${NOTE_NAMES[pc]} minor`;
    }
  }

  return bestKey;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AudioFeatures {
  bpm: number;
  key: string;
}

/**
 * Extract BPM and key from a decoded AudioBuffer.
 *
 * Runs synchronously in-process — suitable for both browser and server
 * (Node has no Web Audio but callers can use OfflineAudioContext for tests).
 */
export function analyzeAudioFeatures(buffer: AudioBuffer): AudioFeatures {
  const bpm = detectBpm(buffer);
  const histogram = buildPitchClassHistogram(buffer);
  const key = detectKey(histogram);
  return { bpm, key };
}
