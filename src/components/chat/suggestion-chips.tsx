"use client";

import { cn } from "@/lib/utils/cn";
import type { Suggestion } from "@/lib/music/types";

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  className?: string;
}

const categoryColors: Record<Suggestion["category"], string> = {
  arrangement: "border-purple-500/30 text-purple-300 hover:bg-purple-500/10",
  instrument: "border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10",
  structure: "border-amber-500/30 text-amber-300 hover:bg-amber-500/10",
  capture: "border-rose-500/30 text-rose-300 hover:bg-rose-500/10",
  export: "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10",
  general: "border-slate-500/30 text-slate-300 hover:bg-slate-500/10",
};

export function SuggestionChips({
  suggestions,
  onSelect,
  className,
}: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 px-4 py-2",
        className,
      )}
    >
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          onClick={() => onSelect(suggestion)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            categoryColors[suggestion.category],
          )}
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}
