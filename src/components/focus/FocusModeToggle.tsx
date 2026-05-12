"use client";

/**
 * FocusModeToggle — dropdown/button group for switching focus modes.
 * MAIN-57: Persists to localStorage; applies panel visibility from mode config.
 */

import { useState, useRef, useEffect } from "react";
import { useFocusMode } from "@/lib/focus/use-focus-mode";
import { FOCUS_MODES, type FocusModeId } from "@/lib/focus/types";
import { cn } from "@/lib/utils/cn";

const MODE_ICONS: Record<FocusModeId, string> = {
  deep_work: "🎯",
  quick_capture: "⚡",
  review: "👁",
  off: "○",
};

const MODE_DESCRIPTIONS: Record<FocusModeId, string> = {
  deep_work: "Hide chat and capture — stay in flow",
  quick_capture: "Show only capture and chat",
  review: "Full view, read-only mindset",
  off: "All panels visible",
};

interface FocusModeToggleProps {
  className?: string;
}

export function FocusModeToggle({ className }: FocusModeToggleProps) {
  const { modeId, setFocusMode } = useFocusMode();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  function select(id: FocusModeId) {
    setFocusMode(id);
    setOpen(false);
  }

  const current = FOCUS_MODES[modeId];

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          modeId !== "off"
            ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
            : "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300",
        )}
        aria-label={`Focus mode: ${current.label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span aria-hidden>{MODE_ICONS[modeId]}</span>
        <span>{current.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("transition-transform", open && "rotate-180")}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Focus modes"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-neutral-700 bg-neutral-900 p-1 shadow-2xl"
        >
          {(Object.keys(FOCUS_MODES) as FocusModeId[]).map((id) => {
            const fm = FOCUS_MODES[id];
            const isActive = id === modeId;
            return (
              <button
                key={id}
                role="option"
                aria-selected={isActive}
                onClick={() => select(id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors",
                  isActive
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-neutral-300 hover:bg-neutral-800",
                )}
              >
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <span aria-hidden>{MODE_ICONS[id]}</span>
                  {fm.label}
                  {isActive && (
                    <span className="ml-auto text-[10px] text-violet-400">active</span>
                  )}
                </span>
                <span className="text-[11px] text-neutral-500">{MODE_DESCRIPTIONS[id]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
