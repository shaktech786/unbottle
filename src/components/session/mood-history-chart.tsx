"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

type MoodRating = "stuck" | "distracted" | "okay" | "good" | "in_the_zone";

interface MoodEntry {
  id: string;
  mood: MoodRating;
  created_at: string;
  session_id: string | null;
}

const MOOD_META: Record<MoodRating, { emoji: string; label: string; score: number; color: string }> = {
  stuck:       { emoji: "😶", label: "Stuck",       score: 1, color: "#ef4444" },
  distracted:  { emoji: "😵", label: "Distracted",  score: 2, color: "#f97316" },
  okay:        { emoji: "😐", label: "Okay",        score: 3, color: "#6b7280" },
  good:        { emoji: "😊", label: "Good",        score: 4, color: "#10b981" },
  in_the_zone: { emoji: "🔥", label: "In the zone", score: 5, color: "#6366f1" },
};

const BAR_HEIGHT = 60;

export function MoodHistoryChart({ className }: { className?: string }) {
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mood-history")
      .then((r) => r.json())
      .then((d: { moods?: MoodEntry[] }) => {
        setMoods((d.moods ?? []).slice(0, 14).reverse());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={cn("h-20 animate-pulse rounded-lg bg-neutral-800/50", className)} />;
  }

  if (moods.length === 0) {
    return (
      <p className={cn("text-xs text-neutral-500 italic", className)}>
        No mood data yet — log a session to start tracking.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-neutral-400">Flow history (last 14 sessions)</p>
      <div className="flex items-end gap-1.5" style={{ height: BAR_HEIGHT + 20 }}>
        {moods.map((entry) => {
          const meta = MOOD_META[entry.mood];
          const barH = Math.round((meta.score / 5) * BAR_HEIGHT);
          return (
            <div
              key={entry.id}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${meta.label} — ${new Date(entry.created_at).toLocaleDateString()}`}
            >
              <span className="text-xs leading-none" aria-hidden="true">{meta.emoji}</span>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: barH, backgroundColor: meta.color, opacity: 0.8 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(MOOD_META).map(([key, meta]) => (
          <span key={key} className="flex items-center gap-1 text-xs text-neutral-500">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}
