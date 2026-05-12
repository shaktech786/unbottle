"use client";

/**
 * useSessionHealth — tracks session events and computes health score.
 * MAIN-59
 *
 * Increments meaningfulEdits when caller signals an edit,
 * tracks flow time, and syncs interruption count from useInterruptGuard.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { buildHealthScore, type SessionHealthScore } from "./session-health";

interface UseSessionHealthOptions {
  interruptionCount: number;
}

export interface UseSessionHealthReturn {
  health: SessionHealthScore;
  /** Call whenever the user makes a meaningful edit (note added, moved, etc.) */
  recordEdit: () => void;
  /** Reset the health tracker (e.g. on new session). */
  reset: () => void;
}

const TICK_INTERVAL_MS = 30_000; // tick every 30s = 0.5 minutes

export function useSessionHealth({
  interruptionCount,
}: UseSessionHealthOptions): UseSessionHealthReturn {
  const [meaningfulEdits, setMeaningfulEdits] = useState(0);
  const [flowMinutes, setFlowMinutes] = useState(0);
  const lastInterruptionCountRef = useRef(interruptionCount);

  // Tick flow minutes every 30s (each tick = 0.5 min)
  useEffect(() => {
    const id = setInterval(() => {
      setFlowMinutes((prev) => prev + 0.5);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const recordEdit = useCallback(() => {
    setMeaningfulEdits((prev) => prev + 1);
  }, []);

  const reset = useCallback(() => {
    setMeaningfulEdits(0);
    setFlowMinutes(0);
    lastInterruptionCountRef.current = interruptionCount;
  }, [interruptionCount]);

  const health = buildHealthScore({
    flowMinutes,
    interruptionCount,
    meaningfulEdits,
  });

  return { health, recordEdit, reset };
}
