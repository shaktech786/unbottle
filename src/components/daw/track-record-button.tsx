"use client";

import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// LevelMeter — thin bar showing RMS input level
// ---------------------------------------------------------------------------

interface LevelMeterProps {
  level: number; // [0, 1]
  className?: string;
}

export function LevelMeter({ level, className }: LevelMeterProps) {
  const pct = Math.round(Math.min(100, level * 100));
  const color =
    pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div
      className={cn("relative h-2 w-24 rounded-full bg-neutral-700 overflow-hidden", className)}
      role="meter"
      aria-label="Input level"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-75", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrackRecordButton — record button + level meter for a single audio track
// ---------------------------------------------------------------------------

export interface TrackRecordButtonProps {
  isRecording: boolean;
  level: number; // [0, 1] RMS
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}

export function TrackRecordButton({
  isRecording,
  level,
  disabled = false,
  onStart,
  onStop,
  className,
}: TrackRecordButtonProps) {
  function handleClick() {
    if (disabled) return;
    if (isRecording) onStop();
    else onStart();
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all shrink-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",
          isRecording
            ? "bg-red-600 text-white ring-2 ring-red-500/60 animate-pulse focus-visible:ring-red-500"
            : "bg-neutral-700 text-red-400 hover:bg-red-700 hover:text-white focus-visible:ring-neutral-500",
          disabled && "opacity-40 cursor-not-allowed",
        )}
      >
        {/* Circle icon — filled when recording (stop), ring when idle (record) */}
        {isRecording ? (
          /* Stop — square */
          <span className="block w-3 h-3 bg-white rounded-sm" />
        ) : (
          /* Record — circle */
          <span className="block w-3 h-3 bg-red-500 rounded-full" />
        )}
      </button>

      {/* Level meter — only meaningful while recording */}
      {isRecording && <LevelMeter level={level} />}
    </div>
  );
}
