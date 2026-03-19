"use client";

import type { Section } from "@/lib/music/types";
import { SectionTimeline } from "./section-timeline";

interface ArrangementPanelProps {
  sections: Section[];
  onAddSection?: () => void;
}

export function ArrangementPanel({
  sections,
  onAddSection,
}: ArrangementPanelProps) {
  return (
    <div className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-200">Arrangement</h2>
        <span className="font-mono text-xs text-neutral-500">
          {sections.length} section{sections.length !== 1 ? "s" : ""}
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-neutral-400">
            Your arrangement starts here
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Add a section to begin building your track.
          </p>
          {onAddSection && (
            <button
              onClick={onAddSection}
              className="mt-3 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-300 hover:bg-amber-400"
            >
              Add First Section
            </button>
          )}
        </div>
      ) : (
        <SectionTimeline sections={sections} onAddSection={onAddSection} />
      )}
    </div>
  );
}
