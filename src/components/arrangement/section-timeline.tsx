"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { Section } from "@/lib/music/types";
import { SectionCard } from "./section-card";
import { ChordDisplay } from "./chord-display";
import { SectionQuickAdd } from "./section-quick-add";

interface SectionTimelineProps {
  sections: Section[];
  onAddSection: (section: Omit<Section, "id" | "sessionId">) => void;
  onDeleteSection?: (sectionId: string) => void;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onLoopSection?: (sectionId: string) => void;
  onClearLoop?: () => void;
  loopingSectionId?: string | null;
  onCopySection?: (sectionId: string) => void;
  onPasteToSection?: (sectionId: string) => void;
  hasCopiedNotes?: boolean;
  onReorderSections?: (fromIndex: number, toIndex: number) => void;
}

export function SectionTimeline({
  sections,
  onAddSection,
  onDeleteSection,
  onUpdateSection,
  onLoopSection,
  onClearLoop,
  loopingSectionId,
  onCopySection,
  onPasteToSection,
  hasCopiedNotes,
  onReorderSections,
}: SectionTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sections.find((s) => s.id === selectedId);

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const handleRename = (sectionId: string, name: string) => {
    onUpdateSection?.(sectionId, { name });
  };

  // --- Drag handlers ---
  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!onReorderSections) return;
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    [onReorderSections],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (dragIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTarget(index);
    },
    [dragIndex],
  );

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== toIndex && onReorderSections) {
        onReorderSections(dragIndex, toIndex);
      }
      setDragIndex(null);
      setDropTarget(null);
    },
    [dragIndex, onReorderSections],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropTarget(null);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Horizontal scrollable timeline */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={cn(
              "group relative shrink-0 transition-opacity duration-150",
              dragIndex !== null && dragIndex === index && "opacity-40",
              dropTarget !== null && dropTarget === index && dragIndex !== index && "ring-2 ring-amber-500/50 rounded-lg",
            )}
            draggable={!!onReorderSections}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            {onReorderSections && (
              <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 cursor-grab active:cursor-grabbing px-1 py-2"
                style={{ opacity: dragIndex !== null ? 0 : undefined }}
                title="Drag to reorder"
              >
                <svg width="6" height="10" viewBox="0 0 6 10" className="text-neutral-500">
                  <circle cx="1.5" cy="1.5" r="1" fill="currentColor" />
                  <circle cx="4.5" cy="1.5" r="1" fill="currentColor" />
                  <circle cx="1.5" cy="5" r="1" fill="currentColor" />
                  <circle cx="4.5" cy="5" r="1" fill="currentColor" />
                  <circle cx="1.5" cy="8.5" r="1" fill="currentColor" />
                  <circle cx="4.5" cy="8.5" r="1" fill="currentColor" />
                </svg>
              </div>
            )}
            <SectionCard
              section={section}
              isSelected={section.id === selectedId}
              onClick={() =>
                setSelectedId(section.id === selectedId ? null : section.id)
              }
              onDelete={onDeleteSection}
              onRename={handleRename}
              onLoop={onLoopSection}
              onClearLoop={onClearLoop}
              isLooping={loopingSectionId === section.id}
              onCopy={onCopySection}
              onPaste={onPasteToSection}
              hasCopiedNotes={hasCopiedNotes}
            />
          </div>
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
