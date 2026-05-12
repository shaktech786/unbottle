"use client";

/**
 * MasterBusStrip — master bus channel strip with brickwall limiter and
 * peak level meter (L/R dBFS) with clip indicator.
 *
 * The master bus chain in MixerNode is:
 *   sum → DynamicsCompressor (brickwall) → AnalyserNode → destination
 *
 * This component reads the AnalyserNode and shows peak metering.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MasterBusStripProps {
  /** Master fader value 0–1 (100% = unity gain) */
  faderValue: number;
  /** AnalyserNode from the master bus for metering */
  analyser: AnalyserNode | null;
  onFaderChange: (value: number) => void;
}

// ---------------------------------------------------------------------------
// Stereo peak meter
// ---------------------------------------------------------------------------

const CLIP_THRESHOLD_DBFS = -0.1;

function useStereoMeter(analyser: AnalyserNode | null) {
  const [peaks, setPeaks] = useState<{ left: number; right: number }>({
    left: -Infinity,
    right: -Infinity,
  });
  const rafRef = useRef<number | null>(null);
  // Hold peak for 1.5s before decaying
  const holdLeft = useRef(-Infinity);
  const holdRight = useRef(-Infinity);
  const holdLeftTime = useRef(0);
  const holdRightTime = useRef(0);

  useEffect(() => {
    if (!analyser) return;
    const buf = new Float32Array(analyser.fftSize);

    function tick(timestamp: number) {
      analyser!.getFloatTimeDomainData(buf);
      const half = buf.length / 2;

      let peakL = 0;
      let peakR = 0;
      for (let i = 0; i < half; i++) {
        const absL = Math.abs(buf[i]);
        const absR = Math.abs(buf[i + half] ?? buf[i]);
        if (absL > peakL) peakL = absL;
        if (absR > peakR) peakR = absR;
      }

      const dbL = peakL > 0 ? 20 * Math.log10(peakL) : -Infinity;
      const dbR = peakR > 0 ? 20 * Math.log10(peakR) : -Infinity;

      if (dbL >= holdLeft.current) {
        holdLeft.current = dbL;
        holdLeftTime.current = timestamp;
      } else if (timestamp - holdLeftTime.current > 1500) {
        holdLeft.current = dbL;
      }

      if (dbR >= holdRight.current) {
        holdRight.current = dbR;
        holdRightTime.current = timestamp;
      } else if (timestamp - holdRightTime.current > 1500) {
        holdRight.current = dbR;
      }

      setPeaks({ left: holdLeft.current, right: holdRight.current });
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser]);

  return peaks;
}

// ---------------------------------------------------------------------------
// Meter bar
// ---------------------------------------------------------------------------

function MeterBar({ db, label }: { db: number; label: string }) {
  const clamped = Math.max(-60, Math.min(0, isFinite(db) ? db : -60));
  const heightPct = ((clamped + 60) / 60) * 100;
  const isClipping = db > CLIP_THRESHOLD_DBFS;
  const isHot = db > -6;

  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* Clip LED */}
      <div
        className={cn(
          "h-2 w-4 rounded-sm transition-colors",
          isClipping ? "bg-red-500 shadow-[0_0_6px_#ef4444]" : "bg-neutral-800",
        )}
        title={isClipping ? "CLIP" : ""}
      />
      {/* Meter column */}
      <div className="relative h-40 w-4 overflow-hidden rounded-sm bg-neutral-800">
        <div
          className={cn(
            "absolute bottom-0 w-full transition-[height] duration-75",
            isClipping ? "bg-red-500" : isHot ? "bg-yellow-400" : "bg-green-500",
          )}
          style={{ height: `${heightPct}%` }}
        />
        {/* -6dB and -18dB tick marks */}
        <div className="absolute inset-x-0 border-t border-yellow-600/40" style={{ bottom: "60%" }} />
        <div className="absolute inset-x-0 border-t border-green-600/30" style={{ bottom: "30%" }} />
      </div>
      {/* dBFS readout */}
      <span className="font-mono text-[8px] text-neutral-400 tabular-nums">
        {isFinite(db) ? `${db.toFixed(1)}` : "-∞"}
      </span>
      <span className="text-[8px] text-neutral-600">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MasterBusStrip component
// ---------------------------------------------------------------------------

export function MasterBusStrip({ faderValue, analyser, onFaderChange }: MasterBusStripProps) {
  const peaks = useStereoMeter(analyser);

  const handleFaderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFaderChange(parseFloat(e.target.value));
    },
    [onFaderChange],
  );

  const isClipping = peaks.left > CLIP_THRESHOLD_DBFS || peaks.right > CLIP_THRESHOLD_DBFS;

  return (
    <div
      className={cn(
        "flex w-24 flex-col items-center gap-2 rounded-lg border bg-neutral-900 px-3 py-3",
        isClipping ? "border-red-500" : "border-neutral-600",
      )}
      data-testid="master-bus-strip"
    >
      {/* Label */}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        Master
      </span>

      {/* Clip indicator banner */}
      {isClipping && (
        <span className="rounded bg-red-500 px-1 py-0.5 text-[9px] font-bold text-white">
          CLIP
        </span>
      )}

      {/* Stereo meters */}
      <div className="flex gap-1">
        <MeterBar db={peaks.left} label="L" />
        <MeterBar db={peaks.right} label="R" />
      </div>

      {/* Master fader */}
      <div className="flex flex-col items-center gap-1">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={faderValue}
          onChange={handleFaderInput}
          className="h-24 cursor-pointer appearance-none"
          style={{
            writingMode: "vertical-lr",
            direction: "rtl",
            accentColor: "#f59e0b",
          }}
          aria-label="Master fader"
        />
        <span className="text-[9px] text-neutral-500 tabular-nums">
          {Math.round(faderValue * 100)}%
        </span>
      </div>

      {/* Brickwall limiter indicator */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[8px] text-neutral-600">Lim -0.1dB</span>
        <span className="text-[8px] text-neutral-600">Ratio 20:1</span>
      </div>
    </div>
  );
}
