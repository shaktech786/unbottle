"use client";

/**
 * useInterruptGuard — attention interrupt guard for Deep Work mode.
 * MAIN-58
 *
 * During Deep Work mode:
 * - Intercepts browser beforeunload and shows native dialog
 * - Tracks tab visibility changes (Page Visibility API)
 * - Returns state so the UI can show a custom "leave anyway?" modal
 */

import { useEffect, useState, useCallback } from "react";
import { useFocusMode } from "./use-focus-mode";

export interface UseInterruptGuardReturn {
  /** Whether the "leave anyway?" modal should be shown. */
  showGuard: boolean;
  /** Dismiss the guard modal without leaving. */
  dismissGuard: () => void;
  /** Confirm leaving — caller should do the actual navigation. */
  confirmLeave: () => void;
  /** Number of times the user has been interrupted (tab switches). */
  interruptionCount: number;
}

export function useInterruptGuard(): UseInterruptGuardReturn {
  const { modeId } = useFocusMode();
  const isDeepWork = modeId === "deep_work";

  const [showGuard, setShowGuard] = useState(false);
  const [interruptionCount, setInterruptionCount] = useState(0);

  // beforeunload — browser native confirm on tab close / refresh
  useEffect(() => {
    if (!isDeepWork) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a dialog
      e.returnValue = "You're in Deep Work — leave anyway?";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDeepWork]);

  // Page Visibility API — detect tab switches
  useEffect(() => {
    if (!isDeepWork) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        setInterruptionCount((c) => c + 1);
        setShowGuard(true);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isDeepWork]);

  const dismissGuard = useCallback(() => setShowGuard(false), []);
  const confirmLeave = useCallback(() => setShowGuard(false), []);

  return { showGuard, dismissGuard, confirmLeave, interruptionCount };
}
