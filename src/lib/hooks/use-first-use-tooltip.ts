"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type TooltipKey = "chat" | "capture" | "piano-roll" | "export";

const STORAGE_KEY = "unbottle-tooltip-dismissed";

// Local cache so the Supabase call only happens once per key per session
let localCache: Record<string, boolean> | null = null;

function readLocalCache(): Record<string, boolean> {
  if (localCache !== null) return localCache;
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    localCache = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    localCache = {};
  }
  return localCache;
}

function writeLocalCache(key: TooltipKey): void {
  if (typeof window === "undefined") return;
  const cache = readLocalCache();
  cache[key] = true;
  localCache = cache;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full — not critical
  }
}

async function syncDismissToSupabase(key: TooltipKey): Promise<void> {
  try {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;

    // Read current preferences, merge in the dismissed key
    const { data: profile } = await client
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();

    const existing =
      (profile?.preferences as Record<string, unknown> | null) ?? {};
    const tooltipDismissed =
      (existing.tooltip_dismissed as Record<string, boolean> | undefined) ?? {};
    tooltipDismissed[key] = true;

    await client
      .from("profiles")
      .update({ preferences: { ...existing, tooltip_dismissed: tooltipDismissed } })
      .eq("id", user.id);
  } catch {
    // Fail open — local state is already updated
  }
}

async function loadDismissedFromSupabase(): Promise<Record<string, boolean>> {
  try {
    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return {};

    const { data: profile } = await client
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle();

    const prefs =
      (profile?.preferences as Record<string, unknown> | null) ?? {};
    return (prefs.tooltip_dismissed as Record<string, boolean> | undefined) ?? {};
  } catch {
    return {};
  }
}

/**
 * Returns { show, dismiss } for a one-time contextual tooltip.
 * - show: true only until the user dismisses (persisted in Supabase + localStorage)
 * - dismiss: records the dismissal locally and syncs to Supabase
 */
export function useFirstUseTooltip(key: TooltipKey): {
  show: boolean;
  dismiss: () => void;
} {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Fast path: already dismissed locally — no state update needed (initial is false)
    const cache = readLocalCache();
    if (cache[key]) return;

    // Slow path: check Supabase (in case user cleared localStorage)
    let cancelled = false;
    loadDismissedFromSupabase().then((remote) => {
      if (cancelled) return;
      if (remote[key]) {
        // Sync to local so we skip network next time
        writeLocalCache(key);
        // show stays false (initial)
      } else {
        setShow(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const dismiss = useCallback(() => {
    setShow(false);
    writeLocalCache(key);
    void syncDismissToSupabase(key);
  }, [key]);

  return { show, dismiss };
}
