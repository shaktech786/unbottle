"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import type { Section, SectionType } from "@/lib/music/types";

interface SectionCardProps {
  section: Section;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: (sectionId: string) => void;
  onRename?: (sectionId: string, name: string) => void;
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

export function SectionCard({
  section,
  isSelected,
  onClick,
  onDelete,
  onRename,
}: SectionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(section.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Width proportional to bar count, with minimum
  const width = Math.max(120, section.lengthBars * 30);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== section.name && onRename) {
      onRename(section.id, trimmed);
    } else {
      setEditValue(section.name);
    }
    setIsEditing(false);
  }, [editValue, section.id, section.name, onRename]);

  const handleNameClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onRename) {
        setEditValue(section.name);
        setIsEditing(true);
      }
    },
    [onRename, section.name],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        commitRename();
      } else if (e.key === "Escape") {
        setEditValue(section.name);
        setIsEditing(false);
      }
    },
    [commitRename, section.name],
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(section.id);
    },
    [onDelete, section.id],
  );

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex shrink-0 flex-col justify-between rounded-lg border px-3 py-3 text-left transition-all duration-200",
        "hover:brightness-110",
        isSelected
          ? "border-white/30 ring-1 ring-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
          : "border-white/10 hover:border-white/20",
      )}
      style={{
        width: `${width}px`,
        minHeight: "88px",
        backgroundColor: `${section.color}15`,
        borderTopColor: section.color,
        borderTopWidth: "3px",
      }}
    >
      {/* Delete button -- visible on hover */}
      {onDelete && (
        <span
          role="button"
          tabIndex={0}
          onClick={handleDeleteClick}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleDeleteClick(e as unknown as React.MouseEvent); }}
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800/80 text-neutral-500 opacity-0 transition-opacity duration-150 hover:bg-red-900/60 hover:text-red-400 group-hover:opacity-100"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      )}

      <div className="min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded bg-neutral-800 px-1 py-0.5 text-xs font-semibold text-neutral-100 outline-none ring-1 ring-amber-500/50"
          />
        ) : (
          <p
            className={cn(
              "truncate text-xs font-semibold text-neutral-100",
              onRename && "cursor-text hover:text-amber-300",
            )}
            onClick={handleNameClick}
            title="Click to rename"
          >
            {section.name}
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-neutral-500">
          {sectionTypeLabels[section.type]}
        </p>
      </div>

      <p className="mt-2 font-mono text-[11px] text-neutral-400">
        {section.lengthBars} bars
      </p>
    </button>
  );
}
