/**
 * Clip trim helpers (MAIN-158).
 *
 * All trim values are fractions [0, 1] of the AudioBuffer's total duration.
 * They map onto the clip's contentOffsetTicks (trim-in) and endOffsetTicks
 * (trim-out) fields in the timeline data model.
 */

// ---------------------------------------------------------------------------
// Trim normalization
// ---------------------------------------------------------------------------

export interface TrimPoints {
  /** Fraction [0,1] — where playback starts within the content. */
  startFraction: number;
  /** Fraction [0,1] — where playback ends within the content. */
  endFraction: number;
}

/** Clamp and validate trim fractions so start < end and both are in [0,1]. */
export function normalizeTrim(start: number, end: number): TrimPoints {
  const s = Math.max(0, Math.min(1, start));
  const e = Math.max(0, Math.min(1, end));
  if (s >= e) {
    // Ensure at least 1% of content is retained
    return { startFraction: Math.max(0, e - 0.01), endFraction: e };
  }
  return { startFraction: s, endFraction: e };
}

// ---------------------------------------------------------------------------
// Fraction ↔ tick conversion
// ---------------------------------------------------------------------------

/**
 * Convert a content fraction to an offset in ticks.
 *
 * @param fraction  [0,1] within the buffer duration
 * @param durationTicks  total clip duration in ticks (= buffer duration)
 */
export function fractionToTicks(fraction: number, durationTicks: number): number {
  return Math.round(Math.max(0, Math.min(1, fraction)) * durationTicks);
}

/**
 * Convert an offset in ticks back to a content fraction.
 */
export function ticksToFraction(ticks: number, durationTicks: number): number {
  if (durationTicks <= 0) return 0;
  return Math.max(0, Math.min(1, ticks / durationTicks));
}

// ---------------------------------------------------------------------------
// Pixel drag → trimmed fraction
// ---------------------------------------------------------------------------

/**
 * Given a drag delta in pixels and the clip width in pixels, compute the
 * new trim fraction for the start or end handle.
 *
 * @param side         "start" | "end"
 * @param dragDeltaPx  positive = right
 * @param clipWidthPx  total clip width in pixels
 * @param currentFraction  previous fraction for the handle being dragged
 * @param otherFraction    fraction of the opposing handle (clamping reference)
 */
export function computeTrimFromDrag(
  side: "start" | "end",
  dragDeltaPx: number,
  clipWidthPx: number,
  currentFraction: number,
  otherFraction: number,
): number {
  if (clipWidthPx <= 0) return currentFraction;
  const delta = dragDeltaPx / clipWidthPx;
  const next = currentFraction + delta;

  if (side === "start") {
    return Math.max(0, Math.min(otherFraction - 0.01, next));
  }
  return Math.min(1, Math.max(otherFraction + 0.01, next));
}
