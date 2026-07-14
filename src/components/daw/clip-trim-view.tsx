"use client";

import { useCallback, useRef, useState } from "react";
import { ClipWaveform } from "./clip-waveform";
import { computeTrimFromDrag, normalizeTrim } from "@/lib/audio/engine/clip-trim";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ClipTrimViewProps {
  buffer: AudioBuffer;
  width: number;
  height: number;
  /** Current trim-in fraction [0,1]. Default 0. */
  startOffset?: number;
  /** Current trim-out fraction [0,1]. Default 1. */
  endOffset?: number;
  /** Called when user finishes dragging a handle. */
  onTrimChange?: (startOffset: number, endOffset: number) => void;
  waveformColor?: string;
  className?: string;
}

const HANDLE_WIDTH = 8; // px

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClipTrimView({
  buffer,
  width,
  height,
  startOffset = 0,
  endOffset = 1,
  onTrimChange,
  waveformColor = "#818cf8",
  className,
}: ClipTrimViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    side: "start" | "end";
    startX: number;
    origFraction: number;
    otherFraction: number;
  } | null>(null);

  const [localStart, setLocalStart] = useState(startOffset);
  const [localEnd, setLocalEnd] = useState(endOffset);

  // Sync from props when they change externally
  const prevStartRef = useRef(startOffset);
  const prevEndRef = useRef(endOffset);
  if (prevStartRef.current !== startOffset) {
    prevStartRef.current = startOffset;
    setLocalStart(startOffset);
  }
  if (prevEndRef.current !== endOffset) {
    prevEndRef.current = endOffset;
    setLocalEnd(endOffset);
  }

  const startHandleX = localStart * width;
  const endHandleX = localEnd * width - HANDLE_WIDTH;

  // ---------------------------------------------------------------------------
  // Mouse events
  // ---------------------------------------------------------------------------

  const handleMouseDown = useCallback(
    (side: "start" | "end") => (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = {
        side,
        startX: e.clientX,
        origFraction: side === "start" ? localStart : localEnd,
        otherFraction: side === "start" ? localEnd : localStart,
      };
    },
    [localStart, localEnd],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      const next = computeTrimFromDrag(
        drag.side,
        delta,
        width,
        drag.origFraction,
        drag.otherFraction,
      );
      if (drag.side === "start") setLocalStart(next);
      else setLocalEnd(next);
    },
    [width],
  );

  const handleMouseUp = useCallback(() => {
    if (!dragRef.current) return;
    const { startFraction, endFraction } = normalizeTrim(localStart, localEnd);
    onTrimChange?.(startFraction, endFraction);
    dragRef.current = null;
  }, [localStart, localEnd, onTrimChange]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className={cn("relative select-none", className)}
      style={{ width, height }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Waveform */}
      <ClipWaveform
        buffer={buffer}
        width={width}
        height={height}
        startOffset={localStart}
        endOffset={localEnd}
        color={waveformColor}
      />

      {/* Greyed-out region before start handle */}
      {localStart > 0 && (
        <div
          className="absolute inset-y-0 left-0 bg-neutral-900/60 pointer-events-none"
          style={{ width: startHandleX }}
        />
      )}

      {/* Greyed-out region after end handle */}
      {localEnd < 1 && (
        <div
          className="absolute inset-y-0 right-0 bg-neutral-900/60 pointer-events-none"
          style={{ width: width - (localEnd * width) }}
        />
      )}

      {/* Start trim handle */}
      <div
        className="absolute inset-y-0 cursor-col-resize z-10 flex items-center justify-center"
        style={{ left: startHandleX, width: HANDLE_WIDTH }}
        onMouseDown={handleMouseDown("start")}
      >
        <div className="w-1 h-3/4 rounded-sm bg-white/80 shadow" />
      </div>

      {/* End trim handle */}
      <div
        className="absolute inset-y-0 cursor-col-resize z-10 flex items-center justify-center"
        style={{ left: endHandleX, width: HANDLE_WIDTH }}
        onMouseDown={handleMouseDown("end")}
      >
        <div className="w-1 h-3/4 rounded-sm bg-white/80 shadow" />
      </div>
    </div>
  );
}
