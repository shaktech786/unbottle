"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { detectTempo } from "@/lib/audio/rhythm-detection";
import { Button } from "@/components/ui/button";

export interface TapPadProps {
  onTempoConfirmed: (bpm: number) => void;
  className?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function TapPad({ onTempoConfirmed, className }: TapPadProps) {
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [bpm, setBpm] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const padRef = useRef<HTMLDivElement>(null);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const now = Date.now();
      const newTaps = [...tapTimes, now];

      // Reset if the gap is too long (> 3 seconds)
      if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 3000) {
        setTapTimes([now]);
        setBpm(0);
        setConfidence(0);
      } else {
        setTapTimes(newTaps);

        if (newTaps.length >= 3) {
          const result = detectTempo(newTaps);
          setBpm(result.bpm);
          setConfidence(result.confidence);
        }
      }

      // Create ripple effect at tap position
      const rect = padRef.current?.getBoundingClientRect();
      if (rect) {
        let clientX: number;
        let clientY: number;

        if ("touches" in e && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else if ("clientX" in e) {
          clientX = e.clientX;
          clientY = e.clientY;
        } else {
          clientX = rect.left + rect.width / 2;
          clientY = rect.top + rect.height / 2;
        }

        const ripple: Ripple = {
          id: rippleIdRef.current++,
          x: clientX - rect.left,
          y: clientY - rect.top,
        };

        setRipples((prev) => [...prev, ripple]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
        }, 600);
      }
    },
    [tapTimes],
  );

  function handleReset() {
    setTapTimes([]);
    setBpm(0);
    setConfidence(0);
  }

  function handleConfirm() {
    if (bpm > 0) {
      onTempoConfirmed(bpm);
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Tap surface */}
      <div
        ref={padRef}
        role="button"
        tabIndex={0}
        onClick={handleTap}
        onTouchStart={handleTap}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            handleTap(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        className={cn(
          "relative flex h-40 items-center justify-center overflow-hidden rounded-xl",
          "border border-neutral-700 bg-neutral-900/80 select-none cursor-pointer",
          "transition-colors hover:border-neutral-500 active:bg-neutral-800/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
        )}
      >
        {/* Ripple animations */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-amber-400/40"
            style={{ left: ripple.x, top: ripple.y }}
          />
        ))}

        <div className="flex flex-col items-center gap-1 pointer-events-none">
          {bpm > 0 ? (
            <>
              <span className="text-3xl font-bold text-stone-100 font-mono">
                {bpm}
              </span>
              <span className="text-xs text-neutral-400">BPM</span>
            </>
          ) : (
            <>
              <span className="text-sm text-neutral-400">
                Tap here to set tempo
              </span>
              <span className="text-xs text-neutral-500">
                {tapTimes.length > 0
                  ? `${tapTimes.length} tap${tapTimes.length > 1 ? "s" : ""}`
                  : "At least 3 taps needed"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      {bpm > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 shrink-0">Confidence</span>
          <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                confidence > 0.8
                  ? "bg-emerald-500"
                  : confidence > 0.5
                    ? "bg-amber-500"
                    : "bg-red-500",
              )}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tap count */}
      <div className="text-center text-xs text-neutral-500">
        {tapTimes.length} tap{tapTimes.length !== 1 ? "s" : ""}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="flex-1"
          disabled={tapTimes.length === 0}
        >
          Reset
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleConfirm}
          className="flex-1"
          disabled={bpm === 0}
        >
          Use {bpm > 0 ? `${bpm} BPM` : "this tempo"}
        </Button>
      </div>
    </div>
  );
}
