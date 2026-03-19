"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface WaveformDisplayProps {
  /** AnalyserNode for real-time visualization during recording. */
  analyserNode?: AnalyserNode | null;
  /** Whether currently recording (animated waveform). */
  isRecording?: boolean;
  /** Audio URL for static waveform display (preview mode). */
  audioUrl?: string | null;
  /** Width of the canvas. */
  width?: number;
  /** Height of the canvas. */
  height?: number;
  className?: string;
}

/**
 * Canvas-based waveform visualization.
 *
 * - During recording: draws real-time waveform from an AnalyserNode.
 * - During preview: decodes audio and draws a static waveform.
 */
export function WaveformDisplay({
  analyserNode,
  isRecording = false,
  audioUrl,
  width = 256,
  height = 64,
  className,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // ── Real-time waveform (recording) ─────────────────────────
  const drawLive = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function animate() {
      if (!canvas || !analyserNode) return;
      const ctx2 = canvas.getContext("2d");
      if (!ctx2) return;

      analyserNode.getByteTimeDomainData(dataArray);

      ctx2.fillStyle = "rgba(15, 23, 42, 1)"; // slate-950
      ctx2.fillRect(0, 0, canvas.width, canvas.height);

      ctx2.lineWidth = 2;
      ctx2.strokeStyle = "#6366f1"; // indigo-500
      ctx2.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx2.moveTo(x, y);
        } else {
          ctx2.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx2.lineTo(canvas.width, canvas.height / 2);
      ctx2.stroke();

      rafRef.current = requestAnimationFrame(animate);
    }

    animate();
  }, [analyserNode]);

  // ── Static waveform (preview) ──────────────────────────────
  const drawStatic = useCallback(
    async (url: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        await audioContext.close();

        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);

        ctx.fillStyle = "rgba(15, 23, 42, 1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#6366f1";
        const mid = canvas.height / 2;

        for (let i = 0; i < canvas.width; i++) {
          let min = 1.0;
          let max = -1.0;

          for (let j = 0; j < step; j++) {
            const sample = data[i * step + j];
            if (sample !== undefined) {
              if (sample < min) min = sample;
              if (sample > max) max = sample;
            }
          }

          const top = mid + min * mid;
          const bottom = mid + max * mid;
          const barHeight = Math.max(1, bottom - top);

          ctx.fillRect(i, top, 1, barHeight);
        }
      } catch {
        // If decoding fails, draw a flat line
        ctx.fillStyle = "rgba(15, 23, 42, 1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#334155";
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
    },
    [],
  );

  useEffect(() => {
    if (isRecording && analyserNode) {
      drawLive();
    } else if (audioUrl) {
      void drawStatic(audioUrl);
    } else {
      // Draw empty state
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "rgba(15, 23, 42, 1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#334155";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [isRecording, analyserNode, audioUrl, drawLive, drawStatic]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn("rounded-lg", className)}
    />
  );
}
