"use client";

import { cn } from "@/lib/utils/cn";
import type { ExportReadinessResult } from "@/lib/finish/export-readiness";

interface ExportReadinessPanelProps {
  result: ExportReadinessResult;
  className?: string;
}

export function ExportReadinessPanel({ result, className }: ExportReadinessPanelProps) {
  const { score, issues } = result;

  const color =
    score === 100
      ? "text-emerald-400"
      : score >= 70
        ? "text-amber-400"
        : "text-red-400";

  const barColor =
    score === 100
      ? "bg-emerald-500"
      : score >= 70
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Export Readiness
        </span>
        <span className={cn("text-xl font-bold tabular-nums", color)}>
          {score}
          <span className="text-sm font-normal text-neutral-500">/100</span>
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${score}%` }}
        />
      </div>

      {issues.length > 0 ? (
        <ul className="space-y-1.5">
          {issues.map((issue) => (
            <li key={issue} className="flex items-start gap-2 text-xs text-neutral-400">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
              {issue}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-emerald-400">All checks passed — ready to export!</p>
      )}
    </div>
  );
}
