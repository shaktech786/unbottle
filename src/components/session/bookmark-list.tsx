"use client";

import type { Bookmark } from "@/lib/music/types";
import { BookmarkChip } from "./bookmark-chip";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  activeId?: string;
  onSelect?: (bookmark: Bookmark) => void;
}

export function BookmarkList({ bookmarks, activeId, onSelect }: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 p-4 text-center">
        <p className="text-xs text-slate-500">No bookmarks yet</p>
        <p className="mt-1 text-[10px] text-slate-600">
          Save your place when you step away.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Bookmarks
      </h3>
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
