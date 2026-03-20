"use client";

import type { Bookmark } from "@/lib/music/types";
import { cn } from "@/lib/utils/cn";

interface ContextReconstructionProps {
  bookmark: Bookmark | null;
  onDismiss?: () => void;
  className?: string;
}

export function ContextReconstruction({
  bookmark,
  onDismiss,
  className,
}: ContextReconstructionProps) {
  if (!bookmark) return null;

  const { contextSnapshot } = bookmark;

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/20 bg-amber-500/5 p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-300">
          Where you left off
        </h3>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {contextSnapshot.currentSection && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <p className="text-xs text-neutral-300">
              Working on: {contextSnapshot.currentSection}
            </p>
          </div>
        )}

        {contextSnapshot.lastAction && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <p className="text-xs text-neutral-300">
              Last action: {contextSnapshot.lastAction}
            </p>
          </div>
        )}

        {contextSnapshot.chatSummary && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <p className="text-xs text-neutral-300">
              Chat context: {contextSnapshot.chatSummary}
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] text-neutral-500">
        Bookmarked {new Date(bookmark.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
