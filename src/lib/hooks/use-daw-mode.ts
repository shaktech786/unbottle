"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePreferences, type UserPreferences } from "./use-preferences";
import { createClient } from "@/lib/supabase/client";

type DawMode = UserPreferences["dawMode"];

async function getAuthenticatedUser() {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}

async function fetchPreferencesFromSupabase(): Promise<Partial<UserPreferences> | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const client = createClient();
  const { data } = await client
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (!data?.preferences || typeof data.preferences !== "object") return null;
  return data.preferences as Partial<UserPreferences>;
}

async function persistPreferencesToSupabase(prefs: Partial<UserPreferences>) {
  const user = await getAuthenticatedUser();
  if (!user) return;

  const client = createClient();
  await client.from("profiles").upsert(
    { id: user.id, preferences: prefs },
    { onConflict: "id" },
  );
}

/**
 * Convenience hook for DAW mode. Hydration order: Supabase (if authenticated) → localStorage.
 * Changes persist to localStorage immediately and sync to Supabase asynchronously.
 */
export function useDawMode(): [DawMode, (mode: DawMode) => void] {
  const { preferences, updatePreference } = usePreferences();
  const hydrated = useRef(false);

  // On mount: pull from Supabase and overwrite localStorage if the user is authenticated.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    void (async () => {
      const remote = await fetchPreferencesFromSupabase();
      if (!remote) return;

      if (remote.dawMode !== undefined) {
        updatePreference("dawMode", remote.dawMode);
      }
      if (remote.reaperBridgePort !== undefined) {
        updatePreference("reaperBridgePort", remote.reaperBridgePort);
      }
      if (remote.reaperSetupComplete !== undefined) {
        updatePreference("reaperSetupComplete", remote.reaperSetupComplete);
      }
    })();
  }, [updatePreference]);

  const setDawMode = useCallback(
    (mode: DawMode) => {
      // Persist to localStorage immediately (via usePreferences' setStoredPreferences).
      updatePreference("dawMode", mode);

      // Sync to Supabase asynchronously — fire and forget.
      void persistPreferencesToSupabase({
        dawMode: mode,
        reaperBridgePort: preferences.reaperBridgePort,
        reaperSetupComplete: preferences.reaperSetupComplete,
      });
    },
    [updatePreference, preferences.reaperBridgePort, preferences.reaperSetupComplete],
  );

  return [preferences.dawMode, setDawMode];
}
