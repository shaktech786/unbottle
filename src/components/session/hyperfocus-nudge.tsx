"use client";

import { cn } from "@/lib/utils/cn";

interface HyperfocusNudgeProps {
  elapsedMinutes: number;
  onDismiss: () => void;
  onStepBack?: () => void;
  className?: string;
}

export function HyperfocusNudge({
  elapsedMinutes,
  onDismiss,
  onStepBack,
  className,
}: HyperfocusNudgeProps) {
  return (
    <div
      className={cn(
        "animate-in slide-in-from-top-2 fade-in duration-300",
        "rounded-xl border border-amber-500/20 bg-amber-600/5 p-4",
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-200">
            You&apos;ve been in the zone for {elapsedMinutes} minutes
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Want to take a step back and listen to what you&apos;ve got?
          </p>
          <div className="mt-3 flex gap-2">
            {onStepBack && (
              <button
                onClick={onStepBack}
                className="rounded-lg bg-amber-600/20 px-3 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-600/30"
              >
                Take a listen
              </button>
            )}
            <button
              onClick={onDismiss}
              className="rounded-lg px-3 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
            >
              Keep going
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
