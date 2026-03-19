"use client";

import { cn } from "@/lib/utils/cn";
import type { Bookmark } from "@/lib/music/types";

interface BookmarkChipProps {
  bookmark: Bookmark;
  isActive?: boolean;
  onClick?: () => void;
}

export function BookmarkChip({ bookmark, isActive, onClick }: BookmarkChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        isActive
          ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
          : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800",
      )}
      title={bookmark.description ?? bookmark.label}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill={isActive ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span className="max-w-[120px] truncate">{bookmark.label}</span>
    </button>
  );
}
