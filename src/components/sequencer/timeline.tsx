"use client";

import { useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { PPQ } from "@/lib/music/types";

export interface TimelineProps {
  /** Pixels per tick. */
  pxPerTick: number;
  /** Total ticks to display. */
  totalTicks: number;
  /** Time signature numerator (beats per bar). */
  beatsPerBar?: number;
  /** Current playhead position in ticks. */
  playheadTick?: number;
  /** Loop region start tick (undefined if no loop). */
  loopStart?: number;
  /** Loop region end tick. */
  loopEnd?: number;
  /** Called when user clicks to set playhead. */
  onSetPlayhead?: (tick: number) => void;
  /** Horizontal scroll offset in pixels. */
  scrollX?: number;
  /** Width of the visible area. */
  width: number;
  className?: string;
}

/**
 * Horizontal ruler above the piano roll.
 * Shows bar numbers and beat divisions.
 */
export function Timeline({
  pxPerTick,
  totalTicks,
  beatsPerBar = 4,
  playheadTick = 0,
  loopStart,
  loopEnd,
  onSetPlayhead,
  scrollX = 0,
  width,
  className,
}: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const HEIGHT = 28;

  const ticksPerBar = beatsPerBar * PPQ;
  const ticksPerBeat = PPQ;

  // Draw the timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0f172a"; // slate-950
    ctx.fillRect(0, 0, width, HEIGHT);

    // Bottom border
    ctx.strokeStyle = "#1e293b"; // slate-800
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 0.5);
    ctx.lineTo(width, HEIGHT - 0.5);
    ctx.stroke();

    // Loop region
    if (loopStart !== undefined && loopEnd !== undefined) {
      const x1 = loopStart * pxPerTick - scrollX;
      const x2 = loopEnd * pxPerTick - scrollX;
      ctx.fillStyle = "#6366f120"; // indigo-500 very transparent
      ctx.fillRect(x1, 0, x2 - x1, HEIGHT);

      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, HEIGHT);
      ctx.moveTo(x2, 0);
      ctx.lineTo(x2, HEIGHT);
      ctx.stroke();
    }

    // Bar and beat markers
    ctx.font = "10px ui-monospace, monospace";
    ctx.textBaseline = "middle";

    for (let tick = 0; tick <= totalTicks; tick += ticksPerBeat) {
      const x = tick * pxPerTick - scrollX;
      if (x < -50 || x > width + 50) continue;

      const isBar = tick % ticksPerBar === 0;
      const barNumber = Math.floor(tick / ticksPerBar) + 1;

      if (isBar) {
        // Bar line
        ctx.strokeStyle = "#475569"; // slate-600
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();

        // Bar number
        ctx.fillStyle = "#94a3b8"; // slate-400
        ctx.fillText(`${barNumber}`, x + 4, HEIGHT / 2);
      } else {
        // Beat tick
        ctx.strokeStyle = "#334155"; // slate-700
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, HEIGHT * 0.6);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      }
    }

    // Playhead marker
    const playX = playheadTick * pxPerTick - scrollX;
    if (playX >= 0 && playX <= width) {
      ctx.fillStyle = "#f97316"; // orange-500
      // Draw small triangle
      ctx.beginPath();
      ctx.moveTo(playX - 5, 0);
      ctx.lineTo(playX + 5, 0);
      ctx.lineTo(playX, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [
    pxPerTick,
    totalTicks,
    ticksPerBar,
    ticksPerBeat,
    beatsPerBar,
    playheadTick,
    loopStart,
    loopEnd,
    scrollX,
    width,
  ]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSetPlayhead) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      const tick = Math.max(0, Math.round(x / pxPerTick));
      onSetPlayhead(tick);
    },
    [onSetPlayhead, scrollX, pxPerTick],
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ width, height: HEIGHT, cursor: "pointer" }}
      className={cn("block", className)}
    />
  );
}
