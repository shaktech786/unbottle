"use client";

import type { Section } from "@/lib/music/types";
import { SectionTimeline } from "./section-timeline";
import { SectionQuickAdd } from "./section-quick-add";

interface ArrangementPanelProps {
  sections: Section[];
  onAddSection: (section: Omit<Section, "id" | "sessionId">) => void;
  onDeleteSection?: (sectionId: string) => void;
  onUpdateSection?: (sectionId: string, updates: Partial<Section>) => void;
  onRequestAIGenerate?: () => void;
  onAddChordsToSequencer?: () => void;
  onLoopSection?: (sectionId: string) => void;
  onClearLoop?: () => void;
  loopingSectionId?: string | null;
  onCopySection?: (sectionId: string) => void;
  onPasteToSection?: (sectionId: string) => void;
  hasCopiedNotes?: boolean;
  onReorderSections?: (fromIndex: number, toIndex: number) => void;
}

export function ArrangementPanel({
  sections,
  onAddSection,
  onDeleteSection,
  onUpdateSection,
  onRequestAIGenerate,
  onAddChordsToSequencer,
  onLoopSection,
  onClearLoop,
  loopingSectionId,
  onCopySection,
  onPasteToSection,
  hasCopiedNotes,
  onReorderSections,
}: ArrangementPanelProps) {
  const hasChords = sections.some((s) => s.chordProgression?.length > 0);
  return (
    <div className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-200">Arrangement</h2>
        <div className="flex items-center gap-2">
          {onAddChordsToSequencer && hasChords && (
            <button
              onClick={onAddChordsToSequencer}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 transition-colors duration-200 hover:bg-emerald-500/20"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              Add Chords to Sequencer
            </button>
          )}
          <span className="font-mono text-xs text-neutral-500">
            {sections.length} section{sections.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          {/* Empty state icon */}
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-500"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </div>
          <p className="text-sm text-neutral-400">
            Your arrangement starts here
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Build your track structure section by section.
          </p>

          {/* Two options */}
          <div className="mt-5 flex items-center gap-3">
            <SectionQuickAdd
              existingSections={sections}
              onAdd={onAddSection}
              compact
            />
            {onRequestAIGenerate && (
              <button
                onClick={onRequestAIGenerate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors duration-200 hover:border-neutral-600 hover:text-neutral-100"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Ask AI to Generate
              </button>
            )}
          </div>
        </div>
      ) : (
        <SectionTimeline
          sections={sections}
          onAddSection={onAddSection}
          onDeleteSection={onDeleteSection}
          onUpdateSection={onUpdateSection}
          onLoopSection={onLoopSection}
          onClearLoop={onClearLoop}
          loopingSectionId={loopingSectionId}
          onCopySection={onCopySection}
          onPasteToSection={onPasteToSection}
          hasCopiedNotes={hasCopiedNotes}
          onReorderSections={onReorderSections}
        />
      )}
    </div>
  );
}
