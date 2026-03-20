"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import type { NoteName } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";

/** Which notes are black keys on a piano. */
const BLACK_KEY_NOTES = new Set<NoteName>(["C#", "D#", "F#", "G#", "A#"]);

export interface NoteGridProps {
  /** Total width in pixels. */
  width: number;
  /** Total height in pixels. */
  height: number;
  /** Height per pitch row. */
  rowHeight: number;
  /** Total number of pitch rows (e.g. 88 for a full piano). */
  totalRows: number;
  /** Array of note names from bottom to top. */
  noteNames: NoteName[];
  /** Ticks per cell (grid snap). Defaults to PPQ / 4 (sixteenth notes). */
  ticksPerCell?: number;
  /** Horizontal pixels per tick. */
  pxPerTick: number;
  /** Total ticks visible. */
  totalTicks: number;
  /** Notes in the current key/scale (highlight these rows). */
  scaleNotes?: Set<NoteName>;
  /** Vertical scroll offset. */
  scrollY?: number;
  className?: string;
}

/**
 * Background grid for the piano roll.
 *
 * Draws horizontal lines for each pitch, vertical lines for each
 * beat/subdivision, and applies alternate row shading for
 * white vs. black keys.
 */
export function NoteGrid({
  width,
  height,
  rowHeight,
  totalRows,
  noteNames,
  ticksPerCell = PPQ / 4,
  pxPerTick,
  totalTicks,
  scaleNotes,
  scrollY = 0,
  className,
}: NoteGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "#0a0a0a"; // neutral-950
    ctx.fillRect(0, 0, width, height);

    // Draw row backgrounds
    for (let row = 0; row < totalRows; row++) {
      const y = row * rowHeight - scrollY;
      if (y + rowHeight < 0 || y > height) continue;

      const noteIndex = totalRows - 1 - row;
      const noteName = noteNames[noteIndex % 12];
      const isBlackKey = BLACK_KEY_NOTES.has(noteName);
      const isScaleNote = scaleNotes?.has(noteName);

      if (isScaleNote) {
        ctx.fillStyle = isBlackKey ? "#451a0380" : "#451a0340"; // amber-950 variants
      } else {
        ctx.fillStyle = isBlackKey ? "#0a0a0a" : "#0a0a0a80"; // neutral-950 variants
      }

      // Slightly lighter for black keys to visually distinguish
      if (isBlackKey && !isScaleNote) {
        ctx.fillStyle = "#050505"; // neutral-950 darker
      }

      ctx.fillRect(0, y, width, rowHeight);

      // Horizontal row divider
      ctx.strokeStyle = "#26262640"; // neutral-800 semi-transparent
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight);
      ctx.lineTo(width, y + rowHeight);
      ctx.stroke();
    }

    // Draw vertical grid lines
    const ticksPerBeat = PPQ;
    const ticksPerBar = ticksPerBeat * 4; // assumes 4/4

    for (let tick = 0; tick <= totalTicks; tick += ticksPerCell) {
      const x = tick * pxPerTick;
      if (x > width) break;

      const isBar = tick % ticksPerBar === 0;
      const isBeat = tick % ticksPerBeat === 0;

      if (isBar) {
        ctx.strokeStyle = "#404040"; // neutral-700
        ctx.lineWidth = 1;
      } else if (isBeat) {
        ctx.strokeStyle = "#262626"; // neutral-800
        ctx.lineWidth = 0.75;
      } else {
        ctx.strokeStyle = "#26262660"; // neutral-800 semi-transparent
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }, [
    width,
    height,
    rowHeight,
    totalRows,
    noteNames,
    ticksPerCell,
    pxPerTick,
    totalTicks,
    scaleNotes,
    scrollY,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={cn("absolute inset-0", className)}
    />
  );
}
