/**
 * Clamp a velocity value to MIDI range 0-127, rounding floats.
 */
export function clampVelocity(velocity: number): number {
  return Math.max(0, Math.min(127, Math.round(velocity)));
}

/**
 * Convert a MIDI velocity (0-127) to a pixel height.
 * Out-of-range velocities are clamped first.
 */
export function velocityToHeight(velocity: number, maxHeight: number): number {
  const clamped = clampVelocity(velocity);
  return (clamped / 127) * maxHeight;
}

/**
 * Convert a pixel height back to a MIDI velocity (0-127).
 * Out-of-range heights are clamped to produce valid velocities.
 */
export function heightToVelocity(height: number, maxHeight: number): number {
  const ratio = Math.max(0, Math.min(1, height / maxHeight));
  return clampVelocity(ratio * 127);
}
