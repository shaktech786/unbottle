"use client";

import { useState } from "react";
import type { Section } from "@/lib/music/types";
import { SectionCard } from "./section-card";
import { ChordDisplay } from "./chord-display";

interface SectionTimelineProps {
  sections: Section[];
  onAddSection?: () => void;
}

export function SectionTimeline({ sections, onAddSection }: SectionTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sections.find((s) => s.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      {/* Horizontal scrollable timeline */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            isSelected={section.id === selectedId}
            onClick={() =>
              setSelectedId(section.id === selectedId ? null : section.id)
            }
          />
        ))}

        {/* Add Section button */}
        <button
          onClick={onAddSection}
          className="flex h-[68px] w-[80px] shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
        >
          <svg
            width="16"
            height="16"
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
          <span className="mt-1 text-[10px]">Add</span>
        </button>
      </div>

      {/* Chord display for selected section */}
      {selected && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-300">
              {selected.name} — Chords
            </p>
          </div>
          <ChordDisplay chordProgression={selected.chordProgression} />
        </div>
      )}
    </div>
  );
}
