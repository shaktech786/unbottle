"use client";

/**
 * SidechainPanel — per-channel UI for sidechain routing.
 *
 * Shows a "sidechain from" dropdown and a drive level knob.
 * The parent is responsible for wiring the SidechainCompressor nodes;
 * this component only emits change events.
 */

import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";

export interface SidechainConfig {
  /** Source track id, or "" for disabled */
  sourceId: string;
  /** Drive level 0–2 */
  level: number;
}

export interface SidechainPanelProps {
  trackId: string;
  trackName: string;
  availableSources: Array<{ id: string; name: string }>;
  config: SidechainConfig;
  onChange: (trackId: string, config: SidechainConfig) => void;
}

export function SidechainPanel({
  trackId,
  trackName,
  availableSources,
  config,
  onChange,
}: SidechainPanelProps) {
  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(trackId, { ...config, sourceId: e.target.value });
    },
    [trackId, config, onChange],
  );

  const handleLevelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(trackId, { ...config, level: parseFloat(e.target.value) });
    },
    [trackId, config, onChange],
  );

  const isActive = config.sourceId !== "";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-neutral-900 p-3",
        isActive ? "border-amber-500/50" : "border-neutral-700",
      )}
      data-testid={`sidechain-panel-${trackId}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-neutral-300 truncate">{trackName}</span>
        {isActive && (
          <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold text-amber-400">
            SC
          </span>
        )}
      </div>

      {/* Source selector */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[9px] text-neutral-500">Sidechain from</label>
        <select
          value={config.sourceId}
          onChange={handleSourceChange}
          className="w-full rounded bg-neutral-800 px-1.5 py-1 text-[10px] text-neutral-200 border border-neutral-700 focus:border-amber-500 focus:outline-none"
          aria-label={`Sidechain source for ${trackName}`}
        >
          <option value="">— off —</option>
          {availableSources
            .filter((s) => s.id !== trackId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </div>

      {/* Drive level (only shown when active) */}
      {isActive && (
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-neutral-500">
            Drive: {config.level.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={config.level}
            onChange={handleLevelChange}
            className="w-full cursor-pointer accent-amber-500"
            aria-label={`Sidechain drive for ${trackName}`}
          />
        </div>
      )}
    </div>
  );
}
