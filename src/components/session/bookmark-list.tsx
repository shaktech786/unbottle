"use client";

import { useCallback, useRef, useState } from "react";
import type { Bookmark } from "@/lib/music/types";
import { cn } from "@/lib/utils/cn";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  activeId?: string;
  onSelect?: (bookmark: Bookmark) => void;
  onAdd?: () => void;
  onDelete?: (bookmarkId: string) => void;
  onRename?: (bookmarkId: string, newLabel: string) => void;
  onRestore?: (bookmark: Bookmark) => void;
}

export function BookmarkList({
  bookmarks,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onRename,
  onRestore,
}: BookmarkListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback((bookmark: Bookmark, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(bookmark.id);
    setEditValue(bookmark.label);
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim() && onRename) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  }, [editingId, editValue, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        commitRename();
      } else if (e.key === "Escape") {
        setEditingId(null);
        setEditValue("");
      }
    },
    [commitRename],
  );

  const handleChipClick = useCallback(
    (bookmark: Bookmark) => {
      if (editingId) return;
      // Toggle expanded state to show snapshot details
      setExpandedId((prev) => (prev === bookmark.id ? null : bookmark.id));
      onSelect?.(bookmark);
    },
    [editingId, onSelect],
  );

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
      <div className="flex flex-col gap-1.5">
        {bookmarks.map((bookmark, index) => {
          const isEditing = editingId === bookmark.id;
          const isExpanded = expandedId === bookmark.id;
          const isActive = bookmark.id === activeId;
          const snap = bookmark.contextSnapshot;
          const prev = index > 0 ? bookmarks[index - 1].contextSnapshot : null;
          const sectionDelta =
            prev != null && snap.sectionCount != null && prev.sectionCount != null
              ? snap.sectionCount - prev.sectionCount
              : null;
          const noteDelta =
            prev != null && snap.noteCount != null && prev.noteCount != null
              ? snap.noteCount - prev.noteCount
              : null;

          return (
            <div key={bookmark.id} className="flex flex-col">
              {/* Chip row */}
              <div className="group flex items-center gap-1">
                <button
                  onClick={() => handleChipClick(bookmark)}
                  className={cn(
                    "inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "border-amber-500 bg-amber-500/20 text-amber-300"
                      : "border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800",
                  )}
                  title={bookmark.description ?? bookmark.label}
                >
                  {/* Bookmark icon */}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill={isActive ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>

                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={handleKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full min-w-0 bg-transparent text-xs text-neutral-200 outline-none placeholder:text-neutral-600"
                      placeholder="Bookmark name"
                    />
                  ) : (
                    <span className="max-w-[120px] truncate">{bookmark.label}</span>
                  )}

                  {/* Delta badges (inline, only when not editing) */}
                  {!isEditing && (sectionDelta !== null || noteDelta !== null) && (
                    <span className="ml-auto flex items-center gap-1 shrink-0">
                      {sectionDelta !== null && sectionDelta !== 0 && (
                        <span
                          className={cn(
                            "rounded px-1 text-[9px] font-medium leading-4",
                            sectionDelta > 0
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400",
                          )}
                        >
                          {sectionDelta > 0 ? "+" : ""}
                          {sectionDelta}s
                        </span>
                      )}
                      {noteDelta !== null && noteDelta !== 0 && (
                        <span
                          className={cn(
                            "rounded px-1 text-[9px] font-medium leading-4",
                            noteDelta > 0
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400",
                          )}
                        >
                          {noteDelta > 0 ? "+" : ""}
                          {noteDelta}n
                        </span>
                      )}
                    </span>
                  )}

                  {/* Expand chevron */}
                  {!isEditing && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn(
                        "shrink-0 transition-transform",
                        sectionDelta === null && noteDelta === null && "ml-auto",
                        isExpanded && "rotate-180",
                      )}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>

                {/* Hover actions: edit + delete */}
                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onRename && (
                      <button
                        onClick={(e) => startEditing(bookmark, e)}
                        className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
                        title="Rename bookmark"
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
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(bookmark.id);
                        }}
                        className="rounded p-1 text-neutral-500 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                        title="Delete bookmark"
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
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded snapshot details */}
              {isExpanded && !isEditing && (
                <div className="ml-4 mt-1.5 rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5 text-[11px]">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-400">
                    {snap.bpm != null && (
                      <div>
                        <span className="text-neutral-500">BPM:</span>{" "}
                        <span className="text-neutral-300">{snap.bpm}</span>
                      </div>
                    )}
                    {snap.keySignature != null && (
                      <div>
                        <span className="text-neutral-500">Key:</span>{" "}
                        <span className="text-neutral-300">{snap.keySignature}</span>
                      </div>
                    )}
                    {snap.sectionCount != null && (
                      <div>
                        <span className="text-neutral-500">Sections:</span>{" "}
                        <span className="text-neutral-300">{snap.sectionCount}</span>
                      </div>
                    )}
                    {snap.noteCount != null && (
                      <div>
                        <span className="text-neutral-500">Notes:</span>{" "}
                        <span className="text-neutral-300">{snap.noteCount}</span>
                      </div>
                    )}
                    {snap.currentSection && (
                      <div className="col-span-2">
                        <span className="text-neutral-500">Section:</span>{" "}
                        <span className="text-neutral-300">{snap.currentSection}</span>
                      </div>
                    )}
                  </div>
                  {(sectionDelta !== null || noteDelta !== null) && (
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {sectionDelta !== null && (
                        <span
                          className={cn(
                            "rounded px-1 py-0.5 text-[10px] font-medium",
                            sectionDelta > 0
                              ? "bg-emerald-500/10 text-emerald-400"
                              : sectionDelta < 0
                                ? "bg-red-500/10 text-red-400"
                                : "bg-neutral-800 text-neutral-500",
                          )}
                        >
                          {sectionDelta > 0 ? "+" : ""}
                          {sectionDelta} sections
                        </span>
                      )}
                      {noteDelta !== null && (
                        <span
                          className={cn(
                            "rounded px-1 py-0.5 text-[10px] font-medium",
                            noteDelta > 0
                              ? "bg-emerald-500/10 text-emerald-400"
                              : noteDelta < 0
                                ? "bg-red-500/10 text-red-400"
                                : "bg-neutral-800 text-neutral-500",
                          )}
                        >
                          {noteDelta > 0 ? "+" : ""}
                          {noteDelta} notes
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-1.5 text-[10px] text-neutral-600">
                    {new Date(bookmark.createdAt).toLocaleString()}
                  </div>
                  {onRestore && (snap.bpm != null || snap.keySignature != null) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(bookmark);
                      }}
                      className="mt-2 w-full rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      Restore BPM &amp; Key
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
