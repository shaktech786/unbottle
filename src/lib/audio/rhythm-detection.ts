/**
 * Rhythm / tempo detection from tap input.
 */

export interface TempoResult {
  bpm: number;
  confidence: number; // 0-1
}

export interface RhythmEvent {
  time: number; // relative time in seconds from first tap
  velocity: number; // 0-127
}

/**
 * Detect tempo (BPM) from an array of tap timestamps (ms since epoch).
 *
 * Requires at least 3 taps. The confidence metric reflects how consistent
 * the inter-tap intervals are (1 = perfectly even, 0 = chaotic).
 */
export function detectTempo(tapTimes: number[]): TempoResult {
  if (tapTimes.length < 3) {
    return { bpm: 0, confidence: 0 };
  }

  // Compute inter-tap intervals in ms
  const intervals: number[] = [];
  for (let i = 1; i < tapTimes.length; i++) {
    intervals.push(tapTimes[i] - tapTimes[i - 1]);
  }

  // Remove obvious outliers (> 3x median)
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const filtered = intervals.filter(
    (iv) => iv > median * 0.33 && iv < median * 3,
  );

  if (filtered.length === 0) {
    return { bpm: 0, confidence: 0 };
  }

  // Average interval
  const avgInterval =
    filtered.reduce((sum, iv) => sum + iv, 0) / filtered.length;

  // BPM = 60000 / interval_ms
  const bpm = Math.round(60000 / avgInterval);

  // Confidence: inverse of coefficient of variation
  const variance =
    filtered.reduce((sum, iv) => sum + (iv - avgInterval) ** 2, 0) /
    filtered.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avgInterval; // coefficient of variation
  const confidence = Math.max(0, Math.min(1, 1 - cv));

  return { bpm: Math.max(20, Math.min(300, bpm)), confidence };
}

/**
 * Convert raw tap timestamps into rhythm events relative to the detected tempo.
 *
 * Each event's `time` is quantized to the nearest beat subdivision
 * and expressed in seconds from beat 0.
 *
 * @param tapTimes - Array of timestamps (ms since epoch)
 * @param bpm - Target tempo for quantization
 * @param subdivisions - Grid resolution per beat (4 = sixteenth notes)
 */
export function detectPattern(
  tapTimes: number[],
  bpm: number,
  subdivisions = 4,
): RhythmEvent[] {
  if (tapTimes.length === 0 || bpm <= 0) return [];

  const beatDurationMs = 60000 / bpm;
  const subdivisionDurationMs = beatDurationMs / subdivisions;
  const firstTap = tapTimes[0];

  return tapTimes.map((t) => {
    const relativeMs = t - firstTap;

    // Quantize to nearest subdivision
    const subdivisionIndex = Math.round(relativeMs / subdivisionDurationMs);
    const quantizedMs = subdivisionIndex * subdivisionDurationMs;

    return {
      time: quantizedMs / 1000, // convert to seconds
      velocity: 100, // default velocity for taps
    };
  });
}
