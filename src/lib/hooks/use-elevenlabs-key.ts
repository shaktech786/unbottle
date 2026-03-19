"use client";

import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "unbottle_elevenlabs_api_key";

// External store for localStorage-backed ElevenLabs API key
// Same pattern as use-api-key.ts (Anthropic key)
let cachedKey: string | null = null;
let isHydrated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string | null {
  if (!isHydrated) {
    cachedKey = localStorage.getItem(STORAGE_KEY);
    isHydrated = true;
  }
  return cachedKey;
}

function getServerSnapshot(): string | null {
  return null;
}

function setStoredKey(key: string | null) {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  cachedKey = key;
  listeners.forEach((l) => l());
}

export function useElevenLabsKey() {
  const apiKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setApiKey = useCallback((key: string | null) => {
    setStoredKey(key);
  }, []);

  const hasUserKey = Boolean(apiKey);

  return { apiKey, setApiKey, hasUserKey, isLoaded: true };
}

/**
 * Get headers to pass user's ElevenLabs key to server routes.
 * The server will use this key if present, otherwise falls back to server key.
 */
export function getElevenLabsAuthHeaders(apiKey: string | null): Record<string, string> {
  if (!apiKey) return {};
  return { "x-elevenlabs-key": apiKey };
}
