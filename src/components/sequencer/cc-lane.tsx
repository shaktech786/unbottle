"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  upsertCCPoint,
  moveCCPoint,
  removeCCPoint,
  interpolateCCValue,
  CC_PRESETS,
  type CCPoint,
  type CCLane,
} from "@/lib/music/cc-lane";
import { PPQ } from "@/lib/music/types";

// ── Constants ────────────────────────────────────────────────

const LANE_HEIGHT = 100;
const POINT_RADIUS = 5;
const HIT_RADIUS = 8;
const SNAP_TOLERANCE = 20; // ticks

const COLORS = {
  bg: "#080808",
  grid: "#1a1a1a",
  curve: "#6366f1",
  curveFill: "rgba(99, 102, 241, 0.15)",
  point: "#818cf8",
  pointHover: "#a5b4fc",
  pointSelected: "#fbbf24",
  label: "rgba(255,255,255,0.4)",
} as const;

// ── Props ────────────────────────────────────────────────────

export interface CCLaneEditorProps {
  lane: CCLane;
  totalBars: number;
  width: number;
  scrollX: number;
  zoom?: number;
  onChange: (lane: CCLane) => void;
  className?: string;
}

// ── Component ────────────────────────────────────────────────

export function CCLaneEditor({
  lane,
  totalBars,
  width,
  scrollX,
  zoom = 1,
  onChange,
  className,
}: CCLaneEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ active: boolean; pointIndex: number; startX: number; startY: number; origTick: number; origValue: number } | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const totalTicks = totalBars * 4 * PPQ;
  const pxPerTick = (width / totalTicks) * zoom;

  // ── Coordinate helpers ───────────────────────────────────────

  function tickToX(tick: number): number {
    return tick * pxPerTick - scrollX;
  }

  function valueToY(value: number): number {
    return LANE_HEIGHT - (value / 127) * LANE_HEIGHT;
  }

  function xToTick(x: number): number {
    return Math.max(0, (x + scrollX) / pxPerTick);
  }

  function yToValue(y: number): number {
    return Math.max(0, Math.min(127, Math.round(((LANE_HEIGHT - y) / LANE_HEIGHT) * 127)));
  }

  function hitTestPoint(x: number, y: number): number {
    for (let i = 0; i < lane.points.length; i++) {
      const px = tickToX(lane.points[i].tick);
      const py = valueToY(lane.points[i].value);
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist <= HIT_RADIUS) return i;
    }
    return -1;
  }

  // ── Canvas draw ─────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = LANE_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, LANE_HEIGHT);

    // Grid lines at 25/50/75/100%
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (const frac of [0.25, 0.5, 0.75]) {
      const y = LANE_HEIGHT * frac;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const pts = lane.points;

    // Draw filled area + curve using interpolation
    if (pts.length > 0) {
      // Build sample points for rendering
      const sampleStep = Math.max(1, Math.floor(4 / pxPerTick));
      ctx.beginPath();

      const firstX = tickToX(pts[0].tick);
      const firstY = valueToY(pts[0].value);

      // Start fill from bottom-left of first point
      ctx.moveTo(firstX, LANE_HEIGHT);
      ctx.lineTo(firstX, firstY);

      // Walk tick samples across the full range
      for (let tick = pts[0].tick + sampleStep; tick <= pts[pts.length - 1].tick; tick += sampleStep) {
        const x = tickToX(tick);
        if (x > width) break;
        ctx.lineTo(x, valueToY(interpolateCCValue(pts, tick)));
      }

      const lastX = tickToX(pts[pts.length - 1].tick);
      const lastY = valueToY(pts[pts.length - 1].value);
      ctx.lineTo(lastX, lastY);
      ctx.lineTo(lastX, LANE_HEIGHT);
      ctx.closePath();

      ctx.fillStyle = COLORS.curveFill;
      ctx.fill();

      // Curve stroke
      ctx.beginPath();
      ctx.moveTo(firstX, firstY);
      for (let tick = pts[0].tick + sampleStep; tick <= pts[pts.length - 1].tick; tick += sampleStep) {
        const x = tickToX(tick);
        if (x > width) break;
        ctx.lineTo(x, valueToY(interpolateCCValue(pts, tick)));
      }
      ctx.lineTo(lastX, lastY);
      ctx.strokeStyle = COLORS.curve;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Control points
    for (let i = 0; i < pts.length; i++) {
      const px = tickToX(pts[i].tick);
      const py = valueToY(pts[i].value);

      if (px < -POINT_RADIUS || px > width + POINT_RADIUS) continue;

      const isHover = hoverIdx === i;
      ctx.beginPath();
      ctx.arc(px, py, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isHover ? COLORS.pointHover : COLORS.point;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = COLORS.label;
    ctx.font = "9px monospace";
    const preset = CC_PRESETS.find((p) => p.cc === lane.ccNumber);
    ctx.fillText(preset?.label ?? `CC${lane.ccNumber}`, 4, 10);
  }, [lane, width, scrollX, zoom, pxPerTick, hoverIdx, totalTicks]);

  // ── Mouse handlers ───────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Right-click: delete point
      if (e.button === 2) {
        const idx = hitTestPoint(x, y);
        if (idx >= 0) {
          onChange({ ...lane, points: removeCCPoint(lane.points, idx) });
          setHoverIdx(null);
        }
        return;
      }

      const idx = hitTestPoint(x, y);

      if (idx >= 0) {
        // Begin dragging existing point
        dragRef.current = {
          active: true,
          pointIndex: idx,
          startX: x,
          startY: y,
          origTick: lane.points[idx].tick,
          origValue: lane.points[idx].value,
        };
        (e.currentTarget as HTMLCanvasElement).style.cursor = "grabbing";
      } else {
        // Add new point
        const tick = Math.round(xToTick(x));
        const value = yToValue(y);
        const newPoints = upsertCCPoint(lane.points, tick, value, SNAP_TOLERANCE);
        onChange({ ...lane, points: newPoints });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lane, onChange],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (dragRef.current?.active) {
        const d = dragRef.current;
        const dx = x - d.startX;
        const dy = y - d.startY;
        const newTick = Math.max(0, d.origTick + dx / pxPerTick);
        const newValue = Math.max(0, Math.min(127, d.origValue - (dy / LANE_HEIGHT) * 127));
        const newPoints = moveCCPoint(lane.points, d.pointIndex, Math.round(newTick), Math.round(newValue));
        // Find new index after sort
        const newIdx = newPoints.findIndex(
          (p) => p.tick === Math.round(newTick) || Math.abs(p.tick - Math.round(newTick)) <= 2,
        );
        dragRef.current.pointIndex = newIdx >= 0 ? newIdx : d.pointIndex;
        onChange({ ...lane, points: newPoints });
        return;
      }

      const idx = hitTestPoint(x, y);
      setHoverIdx(idx >= 0 ? idx : null);
      e.currentTarget.style.cursor = idx >= 0 ? "grab" : "crosshair";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lane, pxPerTick, onChange],
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "crosshair";
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height: LANE_HEIGHT, display: "block", cursor: "crosshair" }}
      className={cn(className)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    />
  );
}

// ── CC Lane container (dropdown + canvas) ───────────────────

export interface CCLaneContainerProps {
  lanes: CCLane[];
  totalBars: number;
  width: number;
  scrollX: number;
  zoom?: number;
  onChangeLane: (index: number, lane: CCLane) => void;
  onAddLane: (ccNumber: number) => void;
  className?: string;
}

export function CCLaneContainer({
  lanes,
  totalBars,
  width,
  scrollX,
  zoom = 1,
  onChangeLane,
  onAddLane,
  className,
}: CCLaneContainerProps) {
  const [addCC, setAddCC] = useState<number>(CC_PRESETS[0].cc);

  return (
    <div className={cn("flex flex-col border-t border-neutral-800 bg-[#050505]", className)}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-neutral-800">
        <span className="text-[9px] font-medium text-neutral-500 tracking-wider uppercase">CC Lanes</span>
        <div className="ml-auto flex items-center gap-1">
          <select
            value={addCC}
            onChange={(e) => setAddCC(Number(e.target.value))}
            className="h-6 rounded bg-neutral-800 text-[10px] text-neutral-300 border border-neutral-700 outline-none cursor-pointer px-1"
          >
            {CC_PRESETS.map((p) => (
              <option key={p.cc} value={p.cc}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onAddLane(addCC)}
            className="h-6 px-2 rounded bg-neutral-700 text-[10px] text-neutral-200 hover:bg-neutral-600 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* One canvas per active lane */}
      {lanes.map((lane, i) => (
        <CCLaneEditor
          key={`${lane.ccNumber}-${i}`}
          lane={lane}
          totalBars={totalBars}
          width={width}
          scrollX={scrollX}
          zoom={zoom}
          onChange={(updated) => onChangeLane(i, updated)}
        />
      ))}

      {lanes.length === 0 && (
        <div className="flex items-center justify-center py-4 text-[10px] text-neutral-600">
          No CC lanes — add one above
        </div>
      )}
    </div>
  );
}
