"use client";

import { cn } from "@/lib/utils/cn";
import type { Section, SectionType } from "@/lib/music/types";

interface SectionCardProps {
  section: Section;
  isSelected?: boolean;
  onClick?: () => void;
}

const sectionTypeLabels: Record<SectionType, string> = {
  intro: "Intro",
  verse: "Verse",
  pre_chorus: "Pre-Chorus",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
  breakdown: "Breakdown",
  custom: "Custom",
};

export function SectionCard({ section, isSelected, onClick }: SectionCardProps) {
  // Width is proportional to bar count, with a minimum
  const width = Math.max(100, section.lengthBars * 30);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-lg border px-3 py-2 text-left transition-all",
        "hover:brightness-110",
        isSelected
          ? "border-white/30 ring-1 ring-indigo-500"
          : "border-white/10 hover:border-white/20",
      )}
      style={{
        width: `${width}px`,
        backgroundColor: `${section.color}20`,
        borderLeftColor: section.color,
        borderLeftWidth: "3px",
      }}
    >
      <div>
        <p className="text-xs font-semibold text-slate-100 truncate">
          {section.name}
        </p>
        <p className="text-[10px] text-slate-400">
          {sectionTypeLabels[section.type]}
        </p>
      </div>
      <p className="mt-1 text-[10px] font-mono text-slate-500">
        {section.lengthBars} bars
      </p>
    </button>
  );
}
