"use client";

/**
 * ChannelStrip — vertical mixer channel with fader, pan knob, mute, solo,
 * per-bus aux send knobs, and a peak level meter.
 *
 * Drives the MixerNode engine layer directly via props callbacks — no Redux,
 * no context, just props down / events up.
 */

import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuxSendConfig {
  name: string;
  level: number;
}

export interface ChannelStripProps {
  trackId: string;
  trackName: string;
  /** 0–1 (maps to gain 0–2 via linear scale, displayed as 0–100%) */
  faderValue: number;
  /** -1 to +1 */
  panValue: number;
  muted: boolean;
  soloed: boolean;
  auxSends: AuxSendConfig[];
  analyser: AnalyserNode | null;
  onFaderChange: (trackId: string, value: number) => void;
  onPanChange: (trackId: string, pan: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onAuxSendChange: (trackId: string, busName: string, level: number) => void;
}

// ---------------------------------------------------------------------------
// Peak meter hook
// ---------------------------------------------------------------------------

function usePeakMeter(analyser: AnalyserNode | null) {
  const [peakDb, setPeakDb] = useState(-Infinity);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser) return;
    const buf = new Float32Array(analyser.fftSize);

    function tick() {
      analyser!.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const abs = Math.abs(buf[i]);
        if (abs > peak) peak = abs;
      }
      const db = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
      setPeakDb(db);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser]);

  return peakDb;
}

// ---------------------------------------------------------------------------
// PeakMeter sub-component
// ---------------------------------------------------------------------------

function PeakMeter({ peakDb }: { peakDb: number }) {
  // Map dBFS to meter height: -60 dB = 0%, 0 dB = 100%
  const clampedDb = Math.max(-60, Math.min(0, isFinite(peakDb) ? peakDb : -60));
  const heightPct = ((clampedDb + 60) / 60) * 100;
  const isClipping = peakDb > -0.1;
  const isHot = peakDb > -6;

  return (
    <div className="flex h-full w-2 flex-col items-center gap-0.5">
      <div
        className={cn(
          "h-1 w-2 rounded-sm transition-colors",
          isClipping ? "bg-red-500" : "bg-neutral-700",
        )}
        title="Clip"
      />
      <div className="relative flex-1 w-2 overflow-hidden rounded-sm bg-neutral-800">
        <div
          className={cn(
            "absolute bottom-0 w-full rounded-sm transition-[height] duration-75",
            isClipping ? "bg-red-500" : isHot ? "bg-yellow-400" : "bg-green-500",
          )}
          style={{ height: `${heightPct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Knob sub-component
// ---------------------------------------------------------------------------

interface KnobProps {
  value: number;
  min: number;
  max: number;
  label: string;
  size?: "sm" | "md";
  onChange: (v: number) => void;
}

function Knob({ value, min, max, label, size = "md", onChange }: KnobProps) {
  const dragStart = useRef<{ y: number; value: number } | null>(null);

  const normalised = (value - min) / (max - min);
  // Rotate -135° to +135° (270° sweep)
  const rotation = -135 + normalised * 270;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStart.current = { y: e.clientY, value };

      function onMove(ev: MouseEvent) {
        if (!dragStart.current) return;
        const delta = (dragStart.current.y - ev.clientY) / 150;
        const next = Math.max(min, Math.min(max, dragStart.current.value + delta * (max - min)));
        onChange(next);
      }

      function onUp() {
        dragStart.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [value, min, max, onChange],
  );

  const dim = size === "sm" ? 24 : 32;

  return (
    <div className="flex flex-col items-center gap-0.5" title={label}>
      <div
        className="cursor-ns-resize rounded-full border border-neutral-600 bg-neutral-700 hover:border-amber-500"
        style={{ width: dim, height: dim }}
        onMouseDown={handleMouseDown}
        aria-label={label}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
      >
        <svg width={dim} height={dim} viewBox="0 0 32 32">
          {/* Tick mark showing position */}
          <line
            x1="16"
            y1="4"
            x2="16"
            y2="10"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${rotation}, 16, 16)`}
          />
        </svg>
      </div>
      {size === "md" && (
        <span className="text-[9px] text-neutral-500 tabular-nums">
          {value > 0 && max > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChannelStrip component
// ---------------------------------------------------------------------------

export function ChannelStrip({
  trackId,
  trackName,
  faderValue,
  panValue,
  muted,
  soloed,
  auxSends,
  analyser,
  onFaderChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onAuxSendChange,
}: ChannelStripProps) {
  const peakDb = usePeakMeter(analyser);

  const handleFaderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFaderChange(trackId, parseFloat(e.target.value));
    },
    [trackId, onFaderChange],
  );

  const isSilent = muted && !soloed;

  return (
    <div
      className={cn(
        "flex w-16 flex-col items-center gap-2 rounded-lg border bg-neutral-900 px-2 py-3",
        soloed
          ? "border-amber-500"
          : isSilent
            ? "border-neutral-700 opacity-50"
            : "border-neutral-700",
      )}
      data-testid={`channel-strip-${trackId}`}
    >
      {/* Track name label */}
      <span
        className="w-full truncate text-center text-[10px] font-medium text-neutral-300"
        title={trackName}
      >
        {trackName}
      </span>

      {/* Mute / Solo buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => onMuteToggle(trackId)}
          className={cn(
            "h-5 w-6 rounded text-[9px] font-bold transition-colors",
            muted
              ? "bg-amber-500 text-white"
              : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600",
          )}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
        >
          M
        </button>
        <button
          onClick={() => onSoloToggle(trackId)}
          className={cn(
            "h-5 w-6 rounded text-[9px] font-bold transition-colors",
            soloed
              ? "bg-green-500 text-white"
              : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600",
          )}
          aria-label={soloed ? "Un-solo" : "Solo"}
          aria-pressed={soloed}
        >
          S
        </button>
      </div>

      {/* Pan knob */}
      <Knob
        value={panValue}
        min={-1}
        max={1}
        label={`Pan: ${panValue.toFixed(2)}`}
        onChange={(v) => onPanChange(trackId, v)}
      />

      {/* Fader + meter row */}
      <div className="flex items-end gap-1">
        {/* Vertical fader */}
        <div className="flex h-32 flex-col items-center justify-end">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={faderValue}
            onChange={handleFaderInput}
            className="h-28 cursor-pointer appearance-none"
            style={{
              writingMode: "vertical-lr",
              direction: "rtl",
              accentColor: "#f59e0b",
            }}
            aria-label={`${trackName} fader`}
          />
          <span className="mt-1 text-[9px] text-neutral-500 tabular-nums">
            {Math.round(faderValue * 100)}%
          </span>
        </div>

        {/* Peak level meter */}
        <div className="h-32 py-1">
          <PeakMeter peakDb={peakDb} />
        </div>
      </div>

      {/* Aux send knobs */}
      {auxSends.length > 0 && (
        <div className="flex w-full flex-col gap-1 border-t border-neutral-800 pt-2">
          {auxSends.map((send) => (
            <div key={send.name} className="flex flex-col items-center gap-0.5">
              <Knob
                value={send.level}
                min={0}
                max={1}
                label={`${send.name} send`}
                size="sm"
                onChange={(v) => onAuxSendChange(trackId, send.name, v)}
              />
              <span className="text-[8px] text-neutral-600 truncate w-full text-center">
                {send.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
