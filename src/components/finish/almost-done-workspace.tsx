"use client";

import { cn } from "@/lib/utils/cn";

interface AlmostDoneWorkspaceProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps the workspace area. When Almost Done mode is active:
 * - Shows an amber border ring
 * - Renders a "Almost Done" badge overlay at top
 *
 * Consumers must also disable add-track and arrangement mutations by
 * checking `active` from `useAlmostDone` in their event handlers.
 */
export function AlmostDoneWorkspace({
  active,
  children,
  className,
}: AlmostDoneWorkspaceProps) {
  return (
    <div
      className={cn(
        "relative transition-all duration-300",
        active && "ring-2 ring-amber-500/60 rounded-xl",
        className,
      )}
    >
      {active && (
        <div
          aria-live="polite"
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 backdrop-blur-sm pointer-events-none"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-medium text-amber-300">
            Almost Done — polish only, arrangement locked
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
