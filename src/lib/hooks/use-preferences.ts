"use client";

import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "unbottle-preferences";

export interface UserPreferences {
  defaultBpm: number;
  defaultGenre: string;
  defaultMood: string;
  hyperfocusMinutes: number;
  autoSaveEnabled: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultBpm: 120,
  defaultGenre: "",
  defaultMood: "",
  hyperfocusMinutes: 45,
  autoSaveEnabled: true,
};

// External store for localStorage-backed preferences
let cachedPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };
let isHydrated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): UserPreferences {
  if (!isHydrated && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        cachedPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      // Corrupted data — fall back to defaults
    }
    isHydrated = true;
  }
  return cachedPreferences;
}

function getServerSnapshot(): UserPreferences {
  return DEFAULT_PREFERENCES;
}

function setStoredPreferences(prefs: UserPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  cachedPreferences = prefs;
  listeners.forEach((l) => l());
}

export function usePreferences() {
  const preferences = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      const next = { ...cachedPreferences, [key]: value };
      setStoredPreferences(next);
    },
    [],
  );

  return { preferences, updatePreference, isLoaded: isHydrated };
}
