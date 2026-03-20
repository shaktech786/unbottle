"use client";

import { useState } from "react";
import type { Section } from "@/lib/music/types";
import { SectionCard } from "./section-card";
import { ChordDisplay } from "./chord-display";
import { SectionQuickAdd } from "./section-quick-add";

interface SectionTimelineProps {
  sections: Section[];
  onAddSection: (section: Omit<Section, "id" | "sessionId">) => void;
  onDeleteSection?: (sectionId: string) => void;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
}

export function SectionTimeline({
  sections,
  onAddSection,
  onDeleteSection,
  onUpdateSection,
}: SectionTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sections.find((s) => s.id === selectedId);

  const handleRename = (sectionId: string, name: string) => {
    onUpdateSection?.(sectionId, { name });
  };

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
            onDelete={onDeleteSection}
            onRename={handleRename}
          />
        ))}

        {/* Add Section quick-add */}
        <SectionQuickAdd
          existingSections={sections}
          onAdd={onAddSection}
        />
      </div>

      {/* Chord display for selected section */}
      {selected && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-300">
              {selected.name} — Chords
            </p>
            <p className="font-mono text-[10px] text-neutral-600">
              {selected.chordProgression.length} chord{selected.chordProgression.length !== 1 ? "s" : ""}
            </p>
          </div>
          <ChordDisplay chordProgression={selected.chordProgression} />
        </div>
      )}
    </div>
  );
}
