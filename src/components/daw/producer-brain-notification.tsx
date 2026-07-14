"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import type { EventPattern } from "@/lib/daw/producer-brain-schema";

const SNOOZE_MS = 10 * 60 * 1000; // 10 minutes
const MIN_INTERVAL_MS = 5 * 60 * 1000; // max 1 notification per 5 minutes

interface ProducerBrainNotificationProps {
  /** Latest detected pattern to display. Pass null to hide. */
  pattern: EventPattern | null;
  onDismiss: () => void;
  onSnooze: () => void;
  className?: string;
}

const PATTERN_LABELS: Record<EventPattern["type"], string> = {
  loop_obsession:  "Loop lock",
  muddy_mix:       "Muddy mix",
  timing_drift:    "Timing drift",
  key_conflict:    "Key conflict",
};

export function ProducerBrainNotification({
  pattern,
  onDismiss,
  onSnooze,
  className,
}: ProducerBrainNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pattern) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    } else {
      setVisible(false);
    }
  }, [pattern]);

  if (!pattern) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 shadow-xl",
        "transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="AI producer suggestion"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0 mt-0.5" />
          <span className="text-xs font-semibold text-indigo-300">
            {PATTERN_LABELS[pattern.type]}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-neutral-600 hover:text-neutral-400 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-neutral-300 leading-relaxed">{pattern.suggestion}</p>
      <button
        type="button"
        onClick={onSnooze}
        className="self-start text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        Snooze 10 min
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook: manages notification state + snooze + rate-limit
// ---------------------------------------------------------------------------

interface UseProducerNotificationReturn {
  activePattern: EventPattern | null;
  notify: (pattern: EventPattern) => void;
  dismiss: () => void;
  snooze: () => void;
}

export function useProducerNotification(): UseProducerNotificationReturn {
  const [activePattern, setActivePattern] = useState<EventPattern | null>(null);
  const snoozedUntilRef = useRef<number>(0);
  const lastShownRef = useRef<number>(0);

  const notify = useCallback((pattern: EventPattern) => {
    const now = Date.now();
    if (now < snoozedUntilRef.current) return;
    if (now - lastShownRef.current < MIN_INTERVAL_MS) return;
    lastShownRef.current = now;
    setActivePattern(pattern);
  }, []);

  const dismiss = useCallback(() => {
    setActivePattern(null);
  }, []);

  const snooze = useCallback(() => {
    snoozedUntilRef.current = Date.now() + SNOOZE_MS;
    setActivePattern(null);
  }, []);

  return { activePattern, notify, dismiss, snooze };
}
