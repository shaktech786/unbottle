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
  onLoop?: (sectionId: string) => void;
  onClearLoop?: () => void;
  isLooping?: boolean;
  onCopy?: (sectionId: string) => void;
  onPaste?: (sectionId: string) => void;
  hasCopiedNotes?: boolean;
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
  onLoop,
  onClearLoop,
  isLooping,
  onCopy,
  onPaste,
  hasCopiedNotes,
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

  const handleLoopClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLooping) {
        onClearLoop?.();
      } else {
        onLoop?.(section.id);
      }
    },
    [isLooping, onClearLoop, onLoop, section.id],
  );

  const handleCopyClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCopy?.(section.id);
    },
    [onCopy, section.id],
  );

  const handlePasteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPaste?.(section.id);
    },
    [onPaste, section.id],
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
        isLooping && "ring-1 ring-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]",
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

      <div className="mt-2 flex items-center justify-between">
        <p className="font-mono text-[11px] text-neutral-400">
          {section.lengthBars} bars
        </p>

        {/* Action buttons -- visible on hover */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {/* Loop button */}
          {onLoop && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleLoopClick}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleLoopClick(e as unknown as React.MouseEvent); }}
              title={isLooping ? "Stop looping" : "Loop section"}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-150",
                isLooping
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "bg-neutral-800/80 text-neutral-500 hover:bg-cyan-900/40 hover:text-cyan-400",
              )}
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
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </span>
          )}

          {/* Copy button */}
          {onCopy && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleCopyClick}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleCopyClick(e as unknown as React.MouseEvent); }}
              title="Copy notes from this section"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800/80 text-neutral-500 transition-colors duration-150 hover:bg-violet-900/40 hover:text-violet-400"
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
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </span>
          )}

          {/* Paste button -- only visible when notes are copied */}
          {onPaste && hasCopiedNotes && (
            <span
              role="button"
              tabIndex={0}
              onClick={handlePasteClick}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handlePasteClick(e as unknown as React.MouseEvent); }}
              title="Paste notes to this section"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 transition-colors duration-150 hover:bg-violet-500/30"
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
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
