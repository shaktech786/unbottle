"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface UnstuckPanelProps {
  idleMinutes: number;
  genre?: string;
  bpm?: number;
  trackCount?: number;
  onDismiss: () => void;
  className?: string;
}

interface Suggestion {
  text: string;
}

export function UnstuckPanel({
  idleMinutes,
  genre,
  bpm,
  trackCount,
  onDismiss,
  className,
}: UnstuckPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/unstuck/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idleMinutes, genre, bpm, trackCount }),
      });
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      const data = (await res.json()) as { suggestions: string[] };
      setSuggestions(data.suggestions.map((text) => ({ text })));
    } catch {
      setError("Couldn't load suggestions right now.");
    } finally {
      setLoading(false);
    }
  }, [idleMinutes, genre, bpm, trackCount]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <div
      className={cn(
        "animate-in slide-in-from-right-4 fade-in duration-300",
        "rounded-xl border border-indigo-500/20 bg-[#0d0d1a] p-4 shadow-xl",
        "w-72",
        className,
      )}
      role="complementary"
      aria-label="Get unstuck suggestions"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-medium text-indigo-300">
            Stuck for {idleMinutes}m?
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-0.5 text-neutral-500 hover:text-neutral-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-neutral-400 mb-3">Here&apos;s what to try next:</p>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-neutral-800/50 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {!loading && !error && (
        <ul className="space-y-2">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="rounded-lg border border-neutral-700/50 bg-neutral-800/30 px-3 py-2 text-xs text-neutral-200 leading-relaxed"
            >
              <span className="text-indigo-400 font-medium mr-1">{i + 1}.</span>
              {s.text}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void fetchSuggestions()}
        className="mt-3 w-full rounded-lg px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors"
      >
        Try different suggestions
      </button>
    </div>
  );
}
