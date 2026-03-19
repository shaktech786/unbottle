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
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Arrangement</h2>
        <span className="text-xs text-slate-500">
          {sections.length} section{sections.length !== 1 ? "s" : ""}
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-slate-500">No sections yet</p>
          <p className="mt-1 text-xs text-slate-600">
            Add a section to start building your arrangement.
          </p>
          {onAddSection && (
            <button
              onClick={onAddSection}
              className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
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
