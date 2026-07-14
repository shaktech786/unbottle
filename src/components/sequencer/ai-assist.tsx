"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import type { Note } from "@/lib/music/types";

// ── Types ────────────────────────────────────────────────────

export interface AISuggestedNote extends Omit<Note, "id"> {
  id: string;
}

export interface AIAssistProps {
  notes: Note[];
  activeTrackId: string;
  totalBars: number;
  bpm?: number;
  keySignature?: string;
  timeSignature?: string;
  /** Suggested notes currently pending acceptance (rendered in roll as "ghost" color) */
  pendingSuggestions: AISuggestedNote[];
  onSuggestionsReady: (notes: AISuggestedNote[]) => void;
  onAccept: () => void;
  onReject: () => void;
  className?: string;
}

// ── Component ────────────────────────────────────────────────

export function AIAssistPanel({
  notes,
  activeTrackId,
  totalBars,
  bpm,
  keySignature,
  timeSignature,
  pendingSuggestions,
  onSuggestionsReady,
  onAccept,
  onReject,
  className,
}: AIAssistProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSuggestions = pendingSuggestions.length > 0;

  const handleRequest = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/piano-roll/gap-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          trackId: activeTrackId,
          totalBars,
          bpm,
          keySignature,
          timeSignature,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { suggestions: AISuggestedNote[] };
      if (!Array.isArray(data.suggestions) || data.suggestions.length === 0) {
        setError("No suggestions returned — try adding a few seed notes first.");
        return;
      }

      onSuggestionsReady(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [notes, activeTrackId, totalBars, bpm, keySignature, timeSignature, onSuggestionsReady]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 border-t border-neutral-800 bg-[#06060a]",
        className,
      )}
    >
      {/* AI Assist trigger */}
      {!hasSuggestions && (
        <button
          onClick={handleRequest}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium transition-colors",
            isLoading
              ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 text-white",
          )}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-3 h-3 border border-neutral-400 border-t-transparent rounded-full animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <AISparkIcon />
              AI Assist
            </>
          )}
        </button>
      )}

      {/* Accept / Reject when suggestions are pending */}
      {hasSuggestions && (
        <>
          <span className="text-xs text-indigo-400 font-medium">
            {pendingSuggestions.length} suggestion{pendingSuggestions.length !== 1 ? "s" : ""} ready
          </span>
          <button
            onClick={onAccept}
            className="h-7 px-3 rounded text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="h-7 px-3 rounded text-xs font-medium bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleRequest}
            disabled={isLoading}
            className="h-7 px-2 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-50"
            title="Regenerate"
          >
            {isLoading ? "..." : "Retry"}
          </button>
        </>
      )}

      {/* Error */}
      {error && (
        <span className="text-xs text-red-400 ml-1">{error}</span>
      )}

      <span className="ml-auto text-[9px] text-neutral-700">AI melodic gap fill</span>
    </div>
  );
}

function AISparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" />
    </svg>
  );
}
