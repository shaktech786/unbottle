"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import type { SessionMoodRating } from "@/app/api/session/[id]/mood/route";

interface MoodOption {
  value: SessionMoodRating;
  label: string;
  emoji: string;
  colorClass: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { value: "stuck", label: "Stuck", emoji: "😶", colorClass: "border-red-500/40 bg-red-500/10 text-red-300" },
  { value: "distracted", label: "Distracted", emoji: "😵", colorClass: "border-orange-500/40 bg-orange-500/10 text-orange-300" },
  { value: "okay", label: "Okay", emoji: "😐", colorClass: "border-neutral-500/40 bg-neutral-500/10 text-neutral-300" },
  { value: "good", label: "Good", emoji: "😊", colorClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  { value: "in_the_zone", label: "In the zone", emoji: "🔥", colorClass: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" },
];

interface MoodTrackerProps {
  sessionId: string;
  onDismiss: () => void;
  className?: string;
}

export function MoodTracker({ sessionId, onDismiss, className }: MoodTrackerProps) {
  const [selected, setSelected] = useState<SessionMoodRating | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async (mood: SessionMoodRating) => {
    setSelected(mood);
    setSaving(true);
    try {
      await fetch(`/api/session/${sessionId}/mood`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });
      setSaved(true);
      setTimeout(onDismiss, 1200);
    } catch {
      // Non-critical — still dismiss
      setTimeout(onDismiss, 800);
    } finally {
      setSaving(false);
    }
  }, [sessionId, onDismiss]);

  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-700 bg-[#0d0d0f] p-5 shadow-xl",
        "animate-in fade-in zoom-in-95 duration-200",
        className,
      )}
      role="dialog"
      aria-label="Session mood check"
    >
      {saved ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-sm text-neutral-300">Logged. See you next time.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-neutral-100">How was your flow?</h3>
            <button
              type="button"
              onClick={onDismiss}
              className="text-neutral-600 hover:text-neutral-400 transition-colors"
              aria-label="Skip"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => void handleSave(opt.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-all",
                  selected === opt.value
                    ? opt.colorClass
                    : "border-neutral-700 bg-neutral-800/40 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                aria-label={opt.label}
              >
                <span className="text-lg leading-none">{opt.emoji}</span>
                <span className="leading-none">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
