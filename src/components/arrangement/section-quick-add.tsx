"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Section, SectionType } from "@/lib/music/types";

interface SectionQuickAddProps {
  existingSections: Section[];
  onAdd: (section: Omit<Section, "id" | "sessionId">) => void;
  /** Compact style for empty state inline usage */
  compact?: boolean;
}

interface SectionTypeOption {
  type: SectionType;
  label: string;
  defaultBars: number;
  color: string;
}

const SECTION_TYPE_OPTIONS: SectionTypeOption[] = [
  { type: "intro", label: "Intro", defaultBars: 4, color: "#6366f1" },
  { type: "verse", label: "Verse", defaultBars: 8, color: "#22c55e" },
  { type: "pre_chorus", label: "Pre-Chorus", defaultBars: 4, color: "#eab308" },
  { type: "chorus", label: "Chorus", defaultBars: 8, color: "#ef4444" },
  { type: "bridge", label: "Bridge", defaultBars: 4, color: "#a855f7" },
  { type: "outro", label: "Outro", defaultBars: 4, color: "#64748b" },
  { type: "breakdown", label: "Breakdown", defaultBars: 4, color: "#06b6d4" },
];

export function SectionQuickAdd({ existingSections, onAdd, compact }: SectionQuickAddProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSelect = useCallback(
    (option: SectionTypeOption) => {
      // Count how many of this type already exist to auto-name
      const countOfType = existingSections.filter(
        (s) => s.type === option.type,
      ).length;
      const name =
        countOfType > 0
          ? `${option.label} ${countOfType + 1}`
          : option.label;

      // Calculate startBar from existing sections
      const lastSection = existingSections.length > 0
        ? existingSections.reduce((latest, s) =>
            s.startBar + s.lengthBars > latest.startBar + latest.lengthBars
              ? s
              : latest,
          )
        : null;
      const startBar = lastSection
        ? lastSection.startBar + lastSection.lengthBars
        : 0;

      onAdd({
        name,
        type: option.type,
        startBar,
        lengthBars: option.defaultBars,
        chordProgression: [],
        sortOrder: existingSections.length,
        color: option.color,
      });
      setOpen(false);
    },
    [existingSections, onAdd],
  );

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={
          compact
            ? "inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-amber-400"
            : "flex h-[88px] w-[80px] flex-col items-center justify-center rounded-lg border border-dashed border-neutral-700 text-neutral-500 transition-colors duration-200 hover:border-amber-500/50 hover:text-amber-400"
        }
      >
        <svg
          width={compact ? 12 : 16}
          height={compact ? 12 : 16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span className={compact ? "text-xs" : "mt-1 text-[10px]"}>
          {compact ? "Add Section" : "Add"}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-lg border border-neutral-700 bg-neutral-900 py-1 shadow-xl shadow-black/40">
          <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Section Type
          </p>
          {SECTION_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => handleSelect(option)}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: option.color }}
              />
              <span>{option.label}</span>
              <span className="ml-auto font-mono text-[10px] text-neutral-600">
                {option.defaultBars}b
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
