"use client";

/**
 * useFocusMode — localStorage-backed focus mode state.
 * MAIN-57
 */

import { useSyncExternalStore, useCallback } from "react";
import {
  FOCUS_MODES,
  DEFAULT_FOCUS_MODE,
  type FocusModeId,
  type FocusMode,
} from "./types";

const STORAGE_KEY = "unbottle-focus-mode";

let cachedMode: FocusModeId = DEFAULT_FOCUS_MODE;
let isHydrated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): FocusModeId {
  if (!isHydrated && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as FocusModeId | null;
      if (stored && stored in FOCUS_MODES) {
        cachedMode = stored;
      }
    } catch {
      // Corrupted storage — fall back to default
    }
    isHydrated = true;
  }
  return cachedMode;
}

function getServerSnapshot(): FocusModeId {
  return DEFAULT_FOCUS_MODE;
}

function setMode(mode: FocusModeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage unavailable
  }
  cachedMode = mode;
  listeners.forEach((l) => l());
}

export interface UseFocusModeReturn {
  modeId: FocusModeId;
  mode: FocusMode;
  setFocusMode: (id: FocusModeId) => void;
  isPanelHidden: (panelId: string) => boolean;
}

export function useFocusMode(): UseFocusModeReturn {
  const modeId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mode = FOCUS_MODES[modeId];

  const setFocusMode = useCallback((id: FocusModeId) => {
    setMode(id);
  }, []);

  const isPanelHidden = useCallback(
    (panelId: string) => mode.hiddenPanels.includes(panelId),
    [mode],
  );

  return { modeId, mode, setFocusMode, isPanelHidden };
}
