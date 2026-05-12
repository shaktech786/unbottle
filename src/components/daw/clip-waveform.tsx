"use client";

import { useEffect, useRef } from "react";
import { renderWaveform, StreamingWaveform } from "@/lib/audio/engine/waveform-renderer";
import { cn } from "@/lib/utils/cn";

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

// ---------------------------------------------------------------------------
// Streaming waveform — updates in real-time during recording
// ---------------------------------------------------------------------------

export interface StreamingClipWaveformProps {
  /** Streaming waveform accumulator instance (shared with recording hook) */
  streaming: StreamingWaveform;
  width: number;
  height: number;
  color?: string;
  background?: string;
  /** How often to redraw (ms). Default 80. */
  refreshMs?: number;
  className?: string;
}

export function StreamingClipWaveform({
  streaming,
  width,
  height,
  color = "#818cf8",
  background,
  refreshMs = 80,
  className,
}: StreamingClipWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const id = setInterval(() => {
      streaming.render(ctx, width, height, color, background);
    }, refreshMs);

    return () => clearInterval(id);
  }, [streaming, width, height, color, background, refreshMs]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
      className={cn(className)}
    />
  );
}
