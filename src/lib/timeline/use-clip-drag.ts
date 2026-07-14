"use client";

import { useCallback, useRef } from "react";
import {
  pixelsToTicks,
  snapToGrid,
  type TimelineTrack,
} from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DragMode = "none" | "move" | "resize";

export interface DragState {
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

export const DRAG_INITIAL: DragState = {
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
// Hook
// ---------------------------------------------------------------------------

export interface UseClipDragOptions {
  /** Pixels per tick at the current zoom level. */
  pixelsPerTick: number;
  /** Grid snap subdivision in ticks. */
  snapTicks: number;
  /** Current horizontal scroll offset in pixels. */
  scrollX: number;
  /** Called when a clip is being moved. */
  onMoveClip?: (clipId: string, startTick: number, trackId?: string) => void;
  /** Called when a clip right edge is being dragged. */
  onResizeClip?: (clipId: string, durationTicks: number) => void;
  /** Resolve the track that contains y-offset `cy` within the content area. */
  trackAtY: (cy: number) => TimelineTrack | null;
}

/**
 * Manages drag-to-move and drag-to-resize state for clips on the arrangement
 * canvas. Returns refs and handlers to attach to canvas mouse events.
 */
export function useClipDrag({
  pixelsPerTick,
  snapTicks,
  scrollX,
  onMoveClip,
  onResizeClip,
  trackAtY,
}: UseClipDragOptions) {
  const dragRef = useRef<DragState>({ ...DRAG_INITIAL });

  const startDrag = useCallback(
    (opts: Omit<DragState, "mode"> & { mode: "move" | "resize" }) => {
      dragRef.current = { ...opts };
    },
    [],
  );

  const endDrag = useCallback(() => {
    dragRef.current = { ...DRAG_INITIAL };
  }, []);

  const applyDrag = useCallback(
    (cx: number, cy: number) => {
      const drag = dragRef.current;
      if (drag.mode === "move" && drag.clipId) {
        const rawTick = pixelsToTicks(cx + scrollX, pixelsPerTick) - drag.tickOffset;
        const newStart = Math.max(0, snapToGrid(rawTick, snapTicks));
        const destTrack = trackAtY(cy);
        onMoveClip?.(drag.clipId, newStart, destTrack?.id ?? drag.origTrackId);
      }

      if (drag.mode === "resize" && drag.clipId) {
        const dx = cx - drag.startX;
        const deltaTicks = snapToGrid(pixelsToTicks(dx, pixelsPerTick), snapTicks);
        const newDuration = Math.max(snapTicks, drag.origDurationTicks + deltaTicks);
        onResizeClip?.(drag.clipId, newDuration);
      }
    },
    [pixelsPerTick, snapTicks, scrollX, trackAtY, onMoveClip, onResizeClip],
  );

  return { dragRef, startDrag, endDrag, applyDrag };
}
