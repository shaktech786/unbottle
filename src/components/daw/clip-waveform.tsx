"use client";

import { useEffect, useRef } from "react";
import { renderWaveform } from "@/lib/audio/engine/waveform-renderer";

// ---------------------------------------------------------------------------
// Static waveform for a decoded AudioBuffer
// ---------------------------------------------------------------------------

export interface ClipWaveformProps {
  buffer: AudioBuffer;
  /** Width in logical px */
  width: number;
  /** Height in logical px */
  height: number;
  /** Trim: fraction [0,1] of buffer start to use. Default 0. */
  startOffset?: number;
  /** Trim: fraction [0,1] of buffer end to use. Default 1. */
  endOffset?: number;
  /** Waveform stroke colour */
  color?: string;
  /** Background fill colour */
  background?: string;
  className?: string;
}

export function ClipWaveform({
  buffer,
  width,
  height,
  startOffset = 0,
  endOffset = 1,
  color = "#818cf8",
  background = "transparent",
  className,
}: ClipWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    renderWaveform(buffer, {
      ctx,
      width,
      height,
      color,
      background: background !== "transparent" ? background : undefined,
      startOffset,
      endOffset,
    });
  }, [buffer, width, height, startOffset, endOffset, color, background]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
      className={className}
    />
  );
}
