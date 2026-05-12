"use client";

import { useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/** Returns true if now - lastEditMs >= thresholdMs */
export function isStuck(lastEditMs: number, nowMs: number, thresholdMs: number): boolean {
  return nowMs - lastEditMs >= thresholdMs;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Tracks the last "meaningful edit" timestamp. Fires `onStuck` once after
 * `thresholdMs` of inactivity. Resets whenever `notifyEdit` is called.
 *
 * "Meaningful edit" = adding/moving/resizing a clip, changing a parameter.
 * The caller decides what counts — just call `notifyEdit()` on those events.
 */
export function useStuckDetector(
  thresholdMs: number,
  onStuck: () => void,
): { notifyEdit: () => void } {
  const lastEditRef = useRef<number>(Date.now());
  const firedRef = useRef<boolean>(false);
  const onStuckRef = useRef(onStuck);
  onStuckRef.current = onStuck;

  useEffect(() => {
    const interval = setInterval(() => {
      if (firedRef.current) return;
      if (isStuck(lastEditRef.current, Date.now(), thresholdMs)) {
        firedRef.current = true;
        onStuckRef.current();
      }
    }, 5000); // poll every 5 s — low overhead

    return () => clearInterval(interval);
  }, [thresholdMs]);

  const notifyEdit = useCallback(() => {
    lastEditRef.current = Date.now();
    firedRef.current = false;
  }, []);

  return { notifyEdit };
}
