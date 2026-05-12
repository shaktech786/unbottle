"use client";

/**
 * InterruptGuardModal — "You're in Deep Work — leave anyway?" modal.
 * MAIN-58
 */

import { cn } from "@/lib/utils/cn";

interface InterruptGuardModalProps {
  open: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  className?: string;
}

export function InterruptGuardModal({
  open,
  onDismiss,
  onConfirm,
  className,
}: InterruptGuardModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Deep Work interrupt guard"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm",
        className,
      )}
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/20">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-violet-400"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        <h2 className="mb-1 text-base font-semibold text-white">You're in Deep Work</h2>
        <p className="mb-5 text-sm text-neutral-400">
          You switched away from your session. Your focus streak is still active —
          come back when you're ready.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            autoFocus
            className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Back to Work
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg border border-neutral-700 py-2.5 text-sm text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-300"
          >
            Leave Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
