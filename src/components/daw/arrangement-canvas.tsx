"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type TimelineState,
  type TimelineClip,
  type TimelineTrack,
  ticksToPixels,
  pixelsToTicks,
  snapToGrid,
  PPQ_DEFAULT as PPQ,
} from "@/lib/timeline/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 28;      // ruler height in px
const RESIZE_HANDLE_PX = 6;    // px from right edge that triggers resize cursor
const AUTO_SCROLL_ZONE = 40;   // px near edge to trigger auto-scroll
const AUTO_SCROLL_SPEED = 6;   // px/frame

const COLORS = {
  bg: "#0a0a0a",
  rulerBg: "#0d0d0d",
  rulerBorder: "#222222",
  rulerText: "#bbbbbb",
  rulerBarLine: "#444444",
  rulerBeatLine: "#2a2a2a",
  trackRowEven: "#111111",
  trackRowOdd: "#0e0e0e",
  trackBorder: "#1e1e1e",
  clipBorder: "rgba(255,255,255,0.15)",
  clipText: "rgba(255,255,255,0.75)",
  clipSelectedBorder: "#fbbf24",
  clipSelectedGlow: "rgba(251,191,36,0.3)",
  playhead: "#f97316",
  loopRegion: "rgba(245,158,11,0.10)",
  loopBorder: "#f59e0b",
  mutedAlpha: 0.4,
} as const;

// ---------------------------------------------------------------------------
// Drag state
// ---------------------------------------------------------------------------

type DragMode = "none" | "move" | "resize";

interface DragState {
  mode: DragMode;
  clipId: string | null;
  origStartTick: number;
  origTrackId: string;
  origDurationTicks: number;
  startX: number;
  startY: number;
  /** tick offset from clip start at mousedown (for move) */
  tickOffset: number;
}

const DRAG_INITIAL: DragState = {
  mode: "none",
  clipId: null,
  origStartTick: 0,
  origTrackId: "",
  origDurationTicks: 0,
  startX: 0,
  startY: 0,
  tickOffset: 0,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArrangementCanvasProps {
  timeline: TimelineState;
  /** Width of the visible canvas area in px */
  width: number;
  /** Height of the content area (below ruler) in px */
  height: number;
  /** Width of the track header column (left sidebar). Default 0 (no header). */
  headerWidth?: number;
  /** Called when user moves a clip */
  onMoveClip?: (clipId: string, startTick: number, trackId?: string) => void;
  /** Called when user resizes a clip (right edge drag) */
  onResizeClip?: (clipId: string, durationTicks: number) => void;
  /** Called when user clicks to set playhead */
  onSetPlayhead?: (tick: number) => void;
  /** Called when horizontal scroll changes */
  onScrollX?: (scrollTick: number) => void;
  /** Grid snap subdivision in ticks. Default PPQ (1 quarter note). */
  snapTicks?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function lightenRgb(r: number, g: number, b: number, amt = 40): string {
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArrangementCanvas({
  timeline,
  width,
  height,
  headerWidth = 0,
  onMoveClip,
  onResizeClip,
  onSetPlayhead,
  onScrollX,
  snapTicks = PPQ,
  className,
}: ArrangementCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState>({ ...DRAG_INITIAL });
  const autoScrollRaf = useRef<number>(0);

  const [scrollX, setScrollX] = useState(0);
  const [dragCursor, setDragCursor] = useState<{ x: number; y: number } | null>(null);

  // Notify parent when scroll changes
  useEffect(() => {
    onScrollX?.(pixelsToTicks(scrollX, timeline.pixelsPerTick));
  }, [scrollX, onScrollX, timeline.pixelsPerTick]);

  // ---------------------------------------------------------------------------
  // Geometry helpers (depend on scroll + zoom)
  // ---------------------------------------------------------------------------

  const ppt = timeline.pixelsPerTick;
  const contentAreaWidth = width - headerWidth;

  /** total content width in px for all clips */
  const totalContentWidth = useRef(0);

  // cumulative y offset per track (sorted by laneIndex)
  const sortedTracks = [...timeline.tracks].sort((a, b) => a.laneIndex - b.laneIndex);

  function trackY(trackId: string): number {
    let y = 0;
    for (const t of sortedTracks) {
      if (t.id === trackId) return y;
      y += t.laneHeight;
    }
    return y;
  }

  function trackAtY(y: number): TimelineTrack | null {
    let acc = 0;
    for (const t of sortedTracks) {
      if (y >= acc && y < acc + t.laneHeight) return t;
      acc += t.laneHeight;
    }
    return null;
  }

  function clipAt(cx: number, cy: number): { clip: TimelineClip; track: TimelineTrack; isResize: boolean } | null {
    const tick = pixelsToTicks(cx + scrollX, ppt);
    let acc = 0;
    for (const track of sortedTracks) {
      const trackTop = acc;
      const trackBottom = acc + track.laneHeight;
      if (cy >= trackTop && cy < trackBottom) {
        for (const clip of track.clips) {
          if (tick >= clip.startTick && tick <= clip.startTick + clip.durationTicks) {
            const clipRight = ticksToPixels(clip.startTick + clip.durationTicks, ppt) - scrollX;
            const isResize = cx >= clipRight - RESIZE_HANDLE_PX;
            return { clip, track, isResize };
          }
        }
        break;
      }
      acc = trackBottom;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Auto-scroll
  // ---------------------------------------------------------------------------

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRaf.current) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = 0;
    }
  }, []);

  const runAutoScroll = useCallback(
    (cx: number) => {
      stopAutoScroll();
      let dx = 0;
      if (cx < AUTO_SCROLL_ZONE) dx = -AUTO_SCROLL_SPEED;
      else if (cx > contentAreaWidth - AUTO_SCROLL_ZONE) dx = AUTO_SCROLL_SPEED;
      if (dx === 0) return;

      const step = () => {
        setScrollX((prev) => Math.max(0, Math.min(totalContentWidth.current - contentAreaWidth, prev + dx)));
        autoScrollRaf.current = requestAnimationFrame(step);
      };
      autoScrollRaf.current = requestAnimationFrame(step);
    },
    [stopAutoScroll, contentAreaWidth],
  );

  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  // ---------------------------------------------------------------------------
  // Canvas draw
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const totalH = HEADER_HEIGHT + height;
    canvas.width = contentAreaWidth * dpr;
    canvas.height = totalH * dpr;
    ctx.scale(dpr, dpr);

    // Compute total content width
    let maxTick = 0;
    for (const t of sortedTracks) {
      for (const c of t.clips) {
        const end = c.startTick + c.durationTicks;
        if (end > maxTick) maxTick = end;
      }
    }
    // Add 8 bars of empty space at the end
    maxTick += 8 * 4 * PPQ;
    totalContentWidth.current = ticksToPixels(maxTick, ppt);

    // ── Ruler ────────────────────────────────────────────────────────────────
    ctx.fillStyle = COLORS.rulerBg;
    ctx.fillRect(0, 0, contentAreaWidth, HEADER_HEIGHT);

    // Bottom border of ruler
    ctx.strokeStyle = COLORS.rulerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT - 0.5);
    ctx.lineTo(contentAreaWidth, HEADER_HEIGHT - 0.5);
    ctx.stroke();

    // Loop region in ruler
    const activeLoop = timeline.regions.find(
      (r) => r.id === timeline.activeLoopRegionId && r.visible,
    );
    if (activeLoop) {
      const lx1 = ticksToPixels(activeLoop.startTick, ppt) - scrollX;
      const lx2 = ticksToPixels(activeLoop.endTick, ppt) - scrollX;
      ctx.fillStyle = COLORS.loopRegion;
      ctx.fillRect(lx1, 0, lx2 - lx1, HEADER_HEIGHT);
      ctx.strokeStyle = COLORS.loopBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx1, 0); ctx.lineTo(lx1, HEADER_HEIGHT);
      ctx.moveTo(lx2, 0); ctx.lineTo(lx2, HEADER_HEIGHT);
      ctx.stroke();
    }

    // Bar / beat ticks
    const beatsPerBar = parseInt(timeline.timeSignature.split("/")[0] ?? "4", 10);
    const ticksPerBar = beatsPerBar * PPQ;
    const ticksPerBeat = PPQ;
    const barWidthPx = ticksToPixels(ticksPerBar, ppt);

    let labelEvery = 1;
    if (barWidthPx < 40) labelEvery = 2;
    if (barWidthPx < 20) labelEvery = 4;
    if (barWidthPx < 10) labelEvery = 8;

    ctx.textBaseline = "middle";
    const firstTick = Math.floor(pixelsToTicks(scrollX, ppt) / ticksPerBeat) * ticksPerBeat;
    for (let tick = firstTick; tick <= pixelsToTicks(scrollX + contentAreaWidth, ppt) + ticksPerBeat; tick += ticksPerBeat) {
      const x = ticksToPixels(tick, ppt) - scrollX;
      if (x < 0 || x > contentAreaWidth) continue;

      const isBar = tick % ticksPerBar === 0;
      const barNumber = Math.floor(tick / ticksPerBar) + 1;

      if (isBar) {
        ctx.strokeStyle = COLORS.rulerBarLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEADER_HEIGHT);
        ctx.stroke();

        if ((barNumber - 1) % labelEvery === 0) {
          ctx.fillStyle = COLORS.rulerText;
          ctx.font = "bold 11px ui-monospace, monospace";
          ctx.fillText(`${barNumber}`, x + 4, HEADER_HEIGHT / 2);
        }
      } else if (barWidthPx >= 20) {
        ctx.strokeStyle = COLORS.rulerBeatLine;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, HEADER_HEIGHT * 0.6);
        ctx.lineTo(x, HEADER_HEIGHT);
        ctx.stroke();
      }
    }

    // Markers
    for (const marker of timeline.markers) {
      const mx = ticksToPixels(marker.tick, ppt) - scrollX;
      if (mx < 0 || mx > contentAreaWidth) continue;
      ctx.strokeStyle = marker.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, HEADER_HEIGHT);
      ctx.stroke();

      // Diamond
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.moveTo(mx, 2);
      ctx.lineTo(mx + 4, 7);
      ctx.lineTo(mx, 12);
      ctx.lineTo(mx - 4, 7);
      ctx.closePath();
      ctx.fill();

      // Label
      ctx.fillStyle = marker.color;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(marker.label, mx + 6, 8);
    }

    // ── Track lanes ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(0, HEADER_HEIGHT);

    let accY = 0;
    sortedTracks.forEach((track, i) => {
      const ty = accY;
      const th = track.laneHeight;

      // Lane background
      ctx.fillStyle = i % 2 === 0 ? COLORS.trackRowEven : COLORS.trackRowOdd;
      ctx.fillRect(0, ty, contentAreaWidth, th);

      // Loop region overlay on lane
      if (activeLoop) {
        const lx1 = ticksToPixels(activeLoop.startTick, ppt) - scrollX;
        const lx2 = ticksToPixels(activeLoop.endTick, ppt) - scrollX;
        ctx.fillStyle = COLORS.loopRegion;
        ctx.fillRect(lx1, ty, lx2 - lx1, th);
      }

      // Bar lines in lane
      const firstBarTick = Math.floor(pixelsToTicks(scrollX, ppt) / ticksPerBar) * ticksPerBar;
      for (let tick = firstBarTick; tick <= pixelsToTicks(scrollX + contentAreaWidth, ppt) + ticksPerBar; tick += ticksPerBeat) {
        const x = ticksToPixels(tick, ppt) - scrollX;
        if (x < 0 || x > contentAreaWidth) continue;
        const isBarLine = tick % ticksPerBar === 0;
        ctx.strokeStyle = isBarLine ? "#1e1e1e" : "#161616";
        ctx.lineWidth = isBarLine ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(x, ty);
        ctx.lineTo(x, ty + th);
        ctx.stroke();
      }

      // Lane bottom border
      ctx.strokeStyle = COLORS.trackBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ty + th - 0.5);
      ctx.lineTo(contentAreaWidth, ty + th - 0.5);
      ctx.stroke();

      // ── Clips ──
      for (const clip of track.clips) {
        const cx = ticksToPixels(clip.startTick, ppt) - scrollX;
        const cw = ticksToPixels(clip.durationTicks, ppt);
        if (cx + cw < 0 || cx > contentAreaWidth) continue;

        const ch = th - 4;
        const cy2 = ty + 2;

        const [r, g, b] = hexToRgb(clip.color ?? track.color);
        const alpha = track.muted || clip.muted ? COLORS.mutedAlpha : 1;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow for selected
        if (clip.selected) {
          ctx.shadowColor = COLORS.clipSelectedGlow;
          ctx.shadowBlur = 8;
        }

        // Fill gradient
        const grad = ctx.createLinearGradient(cx, cy2, cx, cy2 + ch);
        grad.addColorStop(0, lightenRgb(r, g, b, 50));
        grad.addColorStop(1, `rgb(${r},${g},${b})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(cx + 1, cy2, Math.max(2, cw - 2), ch, 3);
        ctx.fill();

        // Reset shadow before border
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = clip.selected ? COLORS.clipSelectedBorder : COLORS.clipBorder;
        ctx.lineWidth = clip.selected ? 1.5 : 1;
        ctx.beginPath();
        ctx.roundRect(cx + 1, cy2, Math.max(2, cw - 2), ch, 3);
        ctx.stroke();

        // Resize handle stripe
        if (cw > 12) {
          ctx.strokeStyle = "rgba(255,255,255,0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx + cw - 4, cy2 + 4);
          ctx.lineTo(cx + cw - 4, cy2 + ch - 4);
          ctx.stroke();
        }

        // Clip label
        const label = clip.name ?? track.name;
        if (cw > 24) {
          ctx.fillStyle = COLORS.clipText;
          ctx.font = "bold 10px ui-sans-serif, system-ui, sans-serif";
          ctx.textBaseline = "middle";
          ctx.save();
          ctx.beginPath();
          ctx.rect(cx + 2, cy2, Math.max(0, cw - 6), ch);
          ctx.clip();
          ctx.fillText(label, cx + 5, cy2 + ch / 2);
          ctx.restore();
        }

        ctx.restore();
      }

      accY += th;
    });

    // ── Playhead ─────────────────────────────────────────────────────────────
    const playX = ticksToPixels(timeline.playheadTick, ppt) - scrollX;
    if (playX >= 0 && playX <= contentAreaWidth) {
      ctx.strokeStyle = COLORS.playhead;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, accY);
      ctx.stroke();
    }

    ctx.restore();
  }, [
    timeline,
    sortedTracks,
    width,
    height,
    contentAreaWidth,
    scrollX,
    ppt,
    dragCursor,
  ]);

  // ---------------------------------------------------------------------------
  // Mouse handlers
  // ---------------------------------------------------------------------------

  function canvasCoords(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top - HEADER_HEIGHT];
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const [cx, cy] = canvasCoords(e);

    // Click in ruler → set playhead
    const rect = e.currentTarget.getBoundingClientRect();
    const rawY = e.clientY - rect.top;
    if (rawY < HEADER_HEIGHT) {
      const tick = snapToGrid(
        pixelsToTicks(cx + scrollX, ppt),
        snapTicks,
      );
      onSetPlayhead?.(Math.max(0, tick));
      return;
    }

    const hit = clipAt(cx, cy);
    if (!hit) return;

    const { clip, track, isResize } = hit;
    const tickOffset = pixelsToTicks(cx + scrollX, ppt) - clip.startTick;

    dragRef.current = {
      mode: isResize ? "resize" : "move",
      clipId: clip.id,
      origStartTick: clip.startTick,
      origTrackId: track.id,
      origDurationTicks: clip.durationTicks,
      startX: cx,
      startY: cy,
      tickOffset,
    };
    setDragCursor({ x: cx, y: cy });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const [cx, cy] = canvasCoords(e);
    const drag = dragRef.current;

    if (drag.mode === "none") {
      // Cursor update
      const rawY = e.clientY - e.currentTarget.getBoundingClientRect().top;
      if (rawY < HEADER_HEIGHT) {
        e.currentTarget.style.cursor = "pointer";
        return;
      }
      const hit = clipAt(cx, cy);
      if (hit?.isResize) {
        e.currentTarget.style.cursor = "col-resize";
      } else if (hit) {
        e.currentTarget.style.cursor = "grab";
      } else {
        e.currentTarget.style.cursor = "default";
      }
      return;
    }

    runAutoScroll(cx);
    setDragCursor({ x: cx, y: cy });

    if (drag.mode === "move" && drag.clipId) {
      const rawTick = pixelsToTicks(cx + scrollX, ppt) - drag.tickOffset;
      const newStart = Math.max(0, snapToGrid(rawTick, snapTicks));
      const destTrack = trackAtY(cy);
      onMoveClip?.(drag.clipId, newStart, destTrack?.id ?? drag.origTrackId);
      e.currentTarget.style.cursor = "grabbing";
    }

    if (drag.mode === "resize" && drag.clipId) {
      const dx = cx - drag.startX;
      const deltaTicks = snapToGrid(pixelsToTicks(dx, ppt), snapTicks);
      const newDuration = Math.max(snapTicks, drag.origDurationTicks + deltaTicks);
      onResizeClip?.(drag.clipId, newDuration);
      e.currentTarget.style.cursor = "col-resize";
    }
  }

  function handleMouseUp() {
    stopAutoScroll();
    dragRef.current = { ...DRAG_INITIAL };
    setDragCursor(null);
  }

  function handleMouseLeave() {
    stopAutoScroll();
    dragRef.current = { ...DRAG_INITIAL };
    setDragCursor(null);
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const maxScroll = Math.max(0, totalContentWidth.current - contentAreaWidth);
    setScrollX((prev) => Math.max(0, Math.min(maxScroll, prev + e.deltaX + e.deltaY)));
  }

  const totalH = HEADER_HEIGHT + height;

  return (
    <canvas
      ref={canvasRef}
      style={{ width: contentAreaWidth, height: totalH }}
      className={className}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
