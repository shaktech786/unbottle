/**
 * Clip gain & fade envelope utilities (MAIN-159).
 *
 * These helpers schedule GainNode automation on a Web Audio GainNode so that
 * per-clip gain and linear fade-in / fade-out are applied during playback.
 *
 * Usage:
 *   const gainNode = ctx.createGain();
 *   applyClipEnvelope(gainNode.gain, {
 *     startTime, durationSec, gain, fadeInSec, fadeOutSec
 *   });
 *   sourceNode.connect(gainNode);
 *   gainNode.connect(destinationNode);
 */

export interface ClipEnvelopeParams {
  /** AudioContext time (seconds) when the clip starts playing. */
  startTime: number;
  /** Total playback duration of the clip in seconds. */
  durationSec: number;
  /** Clip gain [0, 2]. 1 = unity. */
  gain: number;
  /** Fade-in duration in seconds. 0 = no fade. */
  fadeInSec: number;
  /** Fade-out duration in seconds. 0 = no fade. */
  fadeOutSec: number;
}

/**
 * Schedule automation on an AudioParam to apply the clip's gain envelope.
 *
 * All times are absolute AudioContext times.
 */
export function applyClipEnvelope(
  gainParam: AudioParam,
  params: ClipEnvelopeParams,
): void {
  const { startTime, durationSec, gain, fadeInSec, fadeOutSec } = params;

  // Cancel any previously scheduled values in this region
  gainParam.cancelScheduledValues(startTime);

  const endTime = startTime + durationSec;
  const fadeOutStart = Math.max(startTime, endTime - fadeOutSec);

  if (fadeInSec > 0) {
    // Start at 0, ramp up to the clip gain over fadeInSec
    gainParam.setValueAtTime(0, startTime);
    gainParam.linearRampToValueAtTime(gain, startTime + Math.min(fadeInSec, durationSec));
  } else {
    gainParam.setValueAtTime(gain, startTime);
  }

  if (fadeOutSec > 0 && fadeOutStart > startTime + fadeInSec) {
    gainParam.setValueAtTime(gain, fadeOutStart);
    gainParam.linearRampToValueAtTime(0, endTime);
  }
}

// ---------------------------------------------------------------------------
// Tick → seconds conversion helper (matches music/types PPQ)
// ---------------------------------------------------------------------------

const PPQ = 480;

export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks / PPQ) * (60 / bpm);
}

// ---------------------------------------------------------------------------
// Envelope validation
// ---------------------------------------------------------------------------

/** Clamp gain to [0, 2] and fade durations to non-negative values. */
export function validateEnvelopeParams(
  gain: number,
  fadeInSec: number,
  fadeOutSec: number,
  durationSec: number,
): ClipEnvelopeParams & { startTime: number } {
  const clampedGain = Math.max(0, Math.min(2, gain));
  const clampedFadeIn = Math.max(0, fadeInSec);
  const clampedFadeOut = Math.max(0, fadeOutSec);
  // Fades must not overlap: fadeIn + fadeOut <= duration
  const scale =
    clampedFadeIn + clampedFadeOut > durationSec
      ? durationSec / (clampedFadeIn + clampedFadeOut)
      : 1;
  return {
    startTime: 0,
    durationSec,
    gain: clampedGain,
    fadeInSec: clampedFadeIn * scale,
    fadeOutSec: clampedFadeOut * scale,
  };
}
