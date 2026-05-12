"use client";

/**
 * SessionHealthGauge — circular gauge showing the session health score.
 * MAIN-59
 */

import { healthScoreLabel, healthScoreColor, type SessionHealthScore } from "@/lib/focus/session-health";
import { cn } from "@/lib/utils/cn";

interface SessionHealthGaugeProps {
  health: SessionHealthScore;
  className?: string;
}

const SIZE = 72;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SessionHealthGauge({ health, className }: SessionHealthGaugeProps) {
  const offset = CIRCUMFERENCE - (health.score / 100) * CIRCUMFERENCE;
  const color = healthScoreColor(health.score);
  const label = healthScoreLabel(health.score);

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#27272a"
            strokeWidth={STROKE}
          />
          {/* Progress */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
          />
        </svg>
        {/* Score label centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums text-white leading-none">
            {health.score}
          </span>
        </div>
      </div>

      <span className="text-[11px] font-medium text-neutral-400">{label}</span>

      {/* Mini stats */}
      <div className="flex gap-3 text-[10px] text-neutral-600">
        <span title="Flow minutes">{Math.floor(health.flowMinutes)}m flow</span>
        <span title="Interruptions">{health.interruptionCount} interrupt{health.interruptionCount !== 1 ? "s" : ""}</span>
        <span title="Edits">{health.meaningfulEdits} edit{health.meaningfulEdits !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
