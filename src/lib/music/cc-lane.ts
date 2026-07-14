/**
 * CC Lane domain types and helpers.
 * A CC lane stores MIDI continuous controller automation as a list of control
 * points. Values between points are linearly interpolated when rendered.
 */

export interface CCPoint {
  /** Tick position (PPQ-based) */
  tick: number;
  /** Controller value 0–127 */
  value: number;
}

export interface CCLane {
  /** MIDI CC number, e.g. 1 = Modulation, 11 = Expression */
  ccNumber: number;
  points: CCPoint[];
}

/** Well-known CC assignments shown in the dropdown. */
export const CC_PRESETS: { cc: number; label: string }[] = [
  { cc: 1, label: "CC1 — Modulation" },
  { cc: 7, label: "CC7 — Volume" },
  { cc: 10, label: "CC10 — Pan" },
  { cc: 11, label: "CC11 — Expression" },
  { cc: 64, label: "CC64 — Sustain" },
  { cc: 71, label: "CC71 — Resonance" },
  { cc: 74, label: "CC74 — Brightness" },
];

/** Clamp a CC value to 0–127. */
export function clampCC(value: number): number {
  return Math.max(0, Math.min(127, Math.round(value)));
}

/**
 * Insert or update a CC point at the given tick. If an existing point is
 * within `snapTolerance` ticks, it is updated in place; otherwise a new point
 * is appended and the list is re-sorted by tick.
 */
export function upsertCCPoint(
  points: CCPoint[],
  tick: number,
  value: number,
  snapTolerance = 10,
): CCPoint[] {
  const clamped = clampCC(value);
  const idx = points.findIndex((p) => Math.abs(p.tick - tick) <= snapTolerance);
  if (idx >= 0) {
    const updated = [...points];
    updated[idx] = { tick: points[idx].tick, value: clamped };
    return updated;
  }
  return [...points, { tick, value: clamped }].sort((a, b) => a.tick - b.tick);
}

/**
 * Move an existing CC point by index. Keeps the list sorted by tick.
 */
export function moveCCPoint(
  points: CCPoint[],
  index: number,
  newTick: number,
  newValue: number,
): CCPoint[] {
  const updated = [...points];
  updated[index] = { tick: Math.max(0, newTick), value: clampCC(newValue) };
  return updated.sort((a, b) => a.tick - b.tick);
}

/**
 * Remove a CC point by index.
 */
export function removeCCPoint(points: CCPoint[], index: number): CCPoint[] {
  return points.filter((_, i) => i !== index);
}

/**
 * Linearly interpolate the CC value at a given tick position.
 * Returns 0 if there are no points; clamps to first/last value outside range.
 */
export function interpolateCCValue(points: CCPoint[], tick: number): number {
  if (points.length === 0) return 0;
  if (tick <= points[0].tick) return points[0].value;
  if (tick >= points[points.length - 1].tick) return points[points.length - 1].value;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (tick >= a.tick && tick <= b.tick) {
      const t = (tick - a.tick) / (b.tick - a.tick);
      return Math.round(a.value + t * (b.value - a.value));
    }
  }
  return 0;
}
