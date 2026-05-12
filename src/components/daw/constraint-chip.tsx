"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { pickRandomConstraint, type CreativeConstraint } from "@/lib/daw/creative-constraints";

interface ConstraintChipProps {
  className?: string;
}

export function ConstraintChip({ className }: ConstraintChipProps) {
  const [active, setActive] = useState<CreativeConstraint | null>(null);

  const handleConstrain = useCallback(() => {
    setActive((prev) => pickRandomConstraint(prev?.id));
  }, []);

  const handleClear = useCallback(() => {
    setActive(null);
  }, []);

  if (!active) {
    return (
      <button
        type="button"
        onClick={handleConstrain}
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-xs text-neutral-400",
          "hover:border-purple-500/50 hover:text-purple-300 transition-colors",
          className,
        )}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Constrain me
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1",
        className,
      )}
      title={active.text}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-purple-400">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span className="text-xs text-purple-200 max-w-[160px] truncate">{active.text}</span>
      <div className="flex items-center gap-1 ml-1">
        <button
          type="button"
          onClick={handleConstrain}
          className="text-purple-400 hover:text-purple-200 transition-colors"
          title="New constraint"
          aria-label="New constraint"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="text-neutral-500 hover:text-neutral-300 transition-colors"
          title="Clear constraint"
          aria-label="Clear constraint"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
