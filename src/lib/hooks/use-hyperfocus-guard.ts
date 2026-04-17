"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Pure time-logic helpers (exported for testing) ───────────────────────────

/** Returns the number of fully elapsed minutes between startMs and nowMs. */
export function calcElapsedMinutes(startMs: number, nowMs: number): number {
  return Math.floor((nowMs - startMs) / 60000);
}

/** Returns true when elapsedMinutes has reached or exceeded the threshold. */
export function hasReachedThreshold(elapsedMinutes: number, thresholdMinutes = 45): boolean {
  return elapsedMinutes >= thresholdMinutes;
}

// ─────────────────────────────────────────────────────────────────────────────

interface UseHyperfocusGuardOptions {
  /** Minutes before the first nudge (default: 45) */
  thresholdMinutes?: number;
}

interface UseHyperfocusGuardReturn {
  /** Whether the nudge should be visible */
  shouldNudge: boolean;
  /** How many minutes since the session started or last reset */
  elapsedMinutes: number;
  /** Dismiss the current nudge (it will reappear after another threshold period) */
  dismiss: () => void;
  /** Reset the timer entirely (e.g., user took a break) */
  reset: () => void;
}

export function useHyperfocusGuard(
  options: UseHyperfocusGuardOptions = {},
): UseHyperfocusGuardReturn {
  const { thresholdMinutes = 45 } = options;
  const startTime = useRef(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [shouldNudge, setShouldNudge] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Initialize startTime on mount to avoid calling Date.now() during render
  useEffect(() => {
    if (startTime.current === 0) {
      startTime.current = Date.now();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (startTime.current === 0) return;
      const minutes = Math.floor((Date.now() - startTime.current) / 60000);
      setElapsedMinutes(minutes);

      if (minutes >= thresholdMinutes && !dismissed) {
        setShouldNudge(true);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [thresholdMinutes, dismissed]);

  const dismiss = useCallback(() => {
    setShouldNudge(false);
    setDismissed(true);

    // Re-enable the nudge after the same threshold period
    const timeout = setTimeout(() => {
      setDismissed(false);
      startTime.current = Date.now();
      setElapsedMinutes(0);
    }, thresholdMinutes * 60000);

    return () => clearTimeout(timeout);
  }, [thresholdMinutes]);

  const reset = useCallback(() => {
    startTime.current = Date.now();
    setElapsedMinutes(0);
    setShouldNudge(false);
    setDismissed(false);
  }, []);

  return { shouldNudge, elapsedMinutes, dismiss, reset };
}
