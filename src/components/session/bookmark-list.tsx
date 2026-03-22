"use client";

import type { Bookmark } from "@/lib/music/types";
import { BookmarkChip } from "./bookmark-chip";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  activeId?: string;
  onSelect?: (bookmark: Bookmark) => void;
  onAdd?: () => void;
}

export function BookmarkList({ bookmarks, activeId, onSelect, onAdd }: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 p-4 text-center">
        <p className="text-xs text-neutral-500">No bookmarks yet</p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="mt-2 text-[11px] text-amber-400/70 hover:text-amber-400 transition-colors"
          >
            + Save your place
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Bookmarks
        </h3>
        {onAdd && (
          <button
            onClick={onAdd}
            className="text-[11px] text-amber-400/60 hover:text-amber-400 transition-colors"
          >
            + Add
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {bookmarks.map((bookmark) => (
          <BookmarkChip
            key={bookmark.id}
            bookmark={bookmark}
            isActive={bookmark.id === activeId}
            onClick={() => onSelect?.(bookmark)}
          />
        ))}
      </div>
    </div>
  );
}
