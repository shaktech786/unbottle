"use client";

import { cn } from "@/lib/utils/cn";
import { Tooltip } from "@/components/ui/tooltip";

interface FinishStreakBadgeProps {
  streak: number;
  totalFinishes: number;
  className?: string;
}

export function FinishStreakBadge({
  streak,
  totalFinishes,
  className,
}: FinishStreakBadgeProps) {
  if (streak === 0) return null;

  const flame = streak >= 7 ? "🔥🔥" : streak >= 3 ? "🔥" : "✓";

  return (
    <Tooltip
      content={`${streak}-day finish streak · ${totalFinishes} total finishes`}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          streak >= 7
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            : streak >= 3
              ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
          className,
        )}
        aria-label={`${streak}-day finish streak`}
      >
        <span aria-hidden>{flame}</span>
        <span>{streak}</span>
      </div>
    </Tooltip>
  );
}
