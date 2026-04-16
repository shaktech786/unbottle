"use client";

import { useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { PPQ } from "@/lib/music/types";

export interface TimelineProps {
  /** Pixels per tick (base, before zoom). */
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
  /** Horizontal zoom multiplier (default 1). */
  zoom?: number;
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
  zoom = 1,
  className,
}: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const HEIGHT = 28;

  const zoomedPxPerTick = pxPerTick * zoom;
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
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, width, HEIGHT);

    // Bottom border
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 0.5);
    ctx.lineTo(width, HEIGHT - 0.5);
    ctx.stroke();

    // Loop region
    if (loopStart !== undefined && loopEnd !== undefined) {
      const x1 = loopStart * zoomedPxPerTick - scrollX;
      const x2 = loopEnd * zoomedPxPerTick - scrollX;
      ctx.fillStyle = "#f59e0b20"; // amber very transparent
      ctx.fillRect(x1, 0, x2 - x1, HEIGHT);

      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, HEIGHT);
      ctx.moveTo(x2, 0);
      ctx.lineTo(x2, HEIGHT);
      ctx.stroke();
    }

    // Determine bar label skip interval based on how wide each bar is in pixels
    const barWidthPx = ticksPerBar * zoomedPxPerTick;
    let labelEvery: number;
    if (barWidthPx >= 40) {
      labelEvery = 1;       // enough room for every bar number
    } else if (barWidthPx >= 20) {
      labelEvery = 2;       // show every 2nd
    } else if (barWidthPx >= 10) {
      labelEvery = 4;       // show every 4th
    } else {
      labelEvery = 8;       // very zoomed out
    }

    // Bar and beat markers
    ctx.textBaseline = "middle";

    for (let tick = 0; tick <= totalTicks; tick += ticksPerBeat) {
      const x = tick * zoomedPxPerTick - scrollX;
      if (x < -50 || x > width + 50) continue;

      const isBar = tick % ticksPerBar === 0;
      const barNumber = Math.floor(tick / ticksPerBar) + 1;

      if (isBar) {
        // Bar line
        ctx.strokeStyle = "#444444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();

        // Bar number — only show at the label interval
        if ((barNumber - 1) % labelEvery === 0) {
          ctx.fillStyle = "#bbbbbb";
          ctx.font = "bold 11px ui-monospace, monospace";
          ctx.fillText(`${barNumber}`, x + 5, HEIGHT / 2);
        }
      } else {
        // Beat tick — only draw if bars are wide enough to see them
        if (barWidthPx >= 20) {
          ctx.strokeStyle = "#2a2a2a";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, HEIGHT * 0.6);
          ctx.lineTo(x, HEIGHT);
          ctx.stroke();
        }
      }
    }

    // Playhead marker
    const playX = playheadTick * zoomedPxPerTick - scrollX;
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
    zoomedPxPerTick,
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
      const tick = Math.max(0, Math.round(x / zoomedPxPerTick));
      onSetPlayhead(tick);
    },
    [onSetPlayhead, scrollX, zoomedPxPerTick],
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
