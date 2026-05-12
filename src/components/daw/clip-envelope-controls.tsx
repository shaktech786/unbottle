"use client";

import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ClipEnvelopeControlsProps {
  /** Current clip gain [0, 2]. */
  gain: number;
  /** Fade-in duration in seconds. */
  fadeInSec: number;
  /** Fade-out duration in seconds. */
  fadeOutSec: number;
  /** Max fade duration for the sliders (seconds). Default 10. */
  maxFadeSec?: number;
  onGainChange: (gain: number) => void;
  onFadeInChange: (sec: number) => void;
  onFadeOutChange: (sec: number) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helper: labelled slider row
// ---------------------------------------------------------------------------

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] text-neutral-400 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-indigo-500 h-1 cursor-pointer"
      />
      <span className="w-10 text-right text-[10px] text-neutral-300 tabular-nums shrink-0">
        {displayValue}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClipEnvelopeControls
// ---------------------------------------------------------------------------

export function ClipEnvelopeControls({
  gain,
  fadeInSec,
  fadeOutSec,
  maxFadeSec = 10,
  onGainChange,
  onFadeInChange,
  onFadeOutChange,
  className,
}: ClipEnvelopeControlsProps) {
  const gainDb = gain === 0 ? "-∞" : `${(20 * Math.log10(gain)).toFixed(1)} dB`;

  return (
    <div className={cn("flex flex-col gap-1.5 px-3 py-2 bg-neutral-900 rounded-lg", className)}>
      <p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">
        Clip Envelope
      </p>

      <SliderRow
        label="Gain"
        value={gain}
        min={0}
        max={2}
        step={0.01}
        displayValue={gainDb}
        onChange={onGainChange}
      />

      <SliderRow
        label="Fade In"
        value={fadeInSec}
        min={0}
        max={maxFadeSec}
        step={0.01}
        displayValue={`${fadeInSec.toFixed(2)}s`}
        onChange={onFadeInChange}
      />

      <SliderRow
        label="Fade Out"
        value={fadeOutSec}
        min={0}
        max={maxFadeSec}
        step={0.01}
        displayValue={`${fadeOutSec.toFixed(2)}s`}
        onChange={onFadeOutChange}
      />
    </div>
  );
}
