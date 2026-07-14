/**
 * MAIN-159: clip-envelope tests — gain and fade scheduling.
 */

import { describe, it, expect, vi } from "vitest";
import {
  applyClipEnvelope,
  validateEnvelopeParams,
  ticksToSeconds,
} from "./clip-envelope";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockGainParam() {
  return {
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    value: 1,
  } as unknown as AudioParam;
}

// ---------------------------------------------------------------------------
// applyClipEnvelope
// ---------------------------------------------------------------------------

describe("applyClipEnvelope", () => {
  it("sets gain at startTime when no fades", () => {
    const param = makeMockGainParam();
    applyClipEnvelope(param, { startTime: 0, durationSec: 2, gain: 0.8, fadeInSec: 0, fadeOutSec: 0 });
    expect(param.setValueAtTime).toHaveBeenCalledWith(0.8, 0);
    expect(param.linearRampToValueAtTime).not.toHaveBeenCalled();
  });

  it("schedules fade-in ramp", () => {
    const param = makeMockGainParam();
    applyClipEnvelope(param, { startTime: 0, durationSec: 4, gain: 1, fadeInSec: 0.5, fadeOutSec: 0 });
    expect(param.setValueAtTime).toHaveBeenCalledWith(0, 0);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(1, 0.5);
  });

  it("schedules fade-out ramp", () => {
    const param = makeMockGainParam();
    applyClipEnvelope(param, { startTime: 0, durationSec: 4, gain: 1, fadeInSec: 0, fadeOutSec: 1 });
    // Fade out starts at t=3 (4-1), ramps to 0 at t=4
    expect(param.setValueAtTime).toHaveBeenCalledWith(1, 3);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(0, 4);
  });

  it("schedules both fade-in and fade-out", () => {
    const param = makeMockGainParam();
    applyClipEnvelope(param, { startTime: 1, durationSec: 4, gain: 0.9, fadeInSec: 0.5, fadeOutSec: 0.5 });
    // Fade in: 0 at t=1, ramp to 0.9 at t=1.5
    expect(param.setValueAtTime).toHaveBeenCalledWith(0, 1);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(0.9, 1.5);
    // Fade out: 0.9 at t=4.5 (5-0.5), ramp to 0 at t=5
    expect(param.setValueAtTime).toHaveBeenCalledWith(0.9, 4.5);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(0, 5);
  });

  it("calls cancelScheduledValues before scheduling", () => {
    const param = makeMockGainParam();
    applyClipEnvelope(param, { startTime: 2, durationSec: 2, gain: 1, fadeInSec: 0, fadeOutSec: 0 });
    expect(param.cancelScheduledValues).toHaveBeenCalledWith(2);
  });

  it("handles fadeIn longer than duration by clamping", () => {
    const param = makeMockGainParam();
    applyClipEnvelope(param, { startTime: 0, durationSec: 1, gain: 1, fadeInSec: 5, fadeOutSec: 0 });
    // fadeIn is clamped to durationSec
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(1, 1);
  });
});

// ---------------------------------------------------------------------------
// validateEnvelopeParams
// ---------------------------------------------------------------------------

describe("validateEnvelopeParams", () => {
  it("clamps gain to [0, 2]", () => {
    expect(validateEnvelopeParams(3, 0, 0, 2).gain).toBe(2);
    expect(validateEnvelopeParams(-1, 0, 0, 2).gain).toBe(0);
  });

  it("clamps negative fades to 0", () => {
    const p = validateEnvelopeParams(1, -1, -0.5, 2);
    expect(p.fadeInSec).toBe(0);
    expect(p.fadeOutSec).toBe(0);
  });

  it("scales fades proportionally when they exceed duration", () => {
    const p = validateEnvelopeParams(1, 3, 3, 4);
    expect(p.fadeInSec + p.fadeOutSec).toBeCloseTo(4);
  });

  it("preserves fades when sum <= duration", () => {
    const p = validateEnvelopeParams(1, 1, 1, 4);
    expect(p.fadeInSec).toBeCloseTo(1);
    expect(p.fadeOutSec).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// ticksToSeconds
// ---------------------------------------------------------------------------

describe("ticksToSeconds", () => {
  it("converts PPQ ticks (one quarter note) at 120bpm to 0.5s", () => {
    expect(ticksToSeconds(480, 120)).toBeCloseTo(0.5);
  });

  it("converts 0 ticks to 0s", () => {
    expect(ticksToSeconds(0, 120)).toBe(0);
  });

  it("doubles duration when bpm halves", () => {
    const at120 = ticksToSeconds(960, 120);
    const at60 = ticksToSeconds(960, 60);
    expect(at60).toBeCloseTo(at120 * 2);
  });
});
