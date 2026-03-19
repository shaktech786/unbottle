"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { InstrumentType, Track } from "@/lib/music/types";
import { Slider } from "@/components/ui/slider";

const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  synth: "Synth",
  am_synth: "AM Synth",
  fm_synth: "FM Synth",
  membrane_synth: "Membrane",
  metal_synth: "Metal",
  mono_synth: "Mono",
  pluck_synth: "Pluck",
  poly_synth: "Poly",
  sampler: "Sampler",
};

const INSTRUMENT_OPTIONS: InstrumentType[] = [
  "synth",
  "am_synth",
  "fm_synth",
  "membrane_synth",
  "metal_synth",
  "mono_synth",
  "pluck_synth",
  "poly_synth",
  "sampler",
];

export interface TrackRowProps {
  track: Track;
  isSelected?: boolean;
  onSelect?: (trackId: string) => void;
  onMuteToggle?: (trackId: string) => void;
  onSoloToggle?: (trackId: string) => void;
  onVolumeChange?: (trackId: string, volume: number) => void;
  onNameChange?: (trackId: string, name: string) => void;
  onInstrumentChange?: (trackId: string, instrument: InstrumentType) => void;
  className?: string;
}

export function TrackRow({
  track,
  isSelected = false,
  onSelect,
  onMuteToggle,
  onSoloToggle,
  onVolumeChange,
  onNameChange,
  onInstrumentChange,
  className,
}: TrackRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(track.name);

  function handleNameDoubleClick() {
    setIsEditing(true);
    setEditName(track.name);
  }

  function handleNameSubmit() {
    setIsEditing(false);
    const trimmed = editName.trim();
    if (trimmed.length > 0 && trimmed !== track.name) {
      onNameChange?.(track.id, trimmed);
    } else {
      setEditName(track.name);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-slate-800 px-3 py-2",
        "transition-colors cursor-pointer",
        isSelected ? "bg-slate-800/60" : "bg-slate-900/30 hover:bg-slate-800/30",
        className,
      )}
      onClick={() => onSelect?.(track.id)}
    >
      {/* Top row: color + name + mute/solo */}
      <div className="flex items-center gap-2">
        {/* Color indicator */}
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: track.color }}
        />

        {/* Track name */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSubmit();
              if (e.key === "Escape") {
                setIsEditing(false);
                setEditName(track.name);
              }
            }}
            className="flex-1 bg-transparent text-xs text-slate-200 border-b border-indigo-500 outline-none px-0 py-0"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-xs font-medium text-slate-300 truncate"
            onDoubleClick={handleNameDoubleClick}
          >
            {track.name}
          </span>
        )}

        {/* Mute button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMuteToggle?.(track.id);
          }}
          className={cn(
            "h-5 w-5 rounded text-[10px] font-bold transition-colors",
            track.muted
              ? "bg-red-600 text-white"
              : "bg-slate-700 text-slate-400 hover:bg-slate-600",
          )}
          title="Mute"
        >
          M
        </button>

        {/* Solo button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSoloToggle?.(track.id);
          }}
          className={cn(
            "h-5 w-5 rounded text-[10px] font-bold transition-colors",
            track.solo
              ? "bg-amber-500 text-slate-900"
              : "bg-slate-700 text-slate-400 hover:bg-slate-600",
          )}
          title="Solo"
        >
          S
        </button>
      </div>

      {/* Bottom row: instrument + volume */}
      <div className="flex items-center gap-2">
        {/* Instrument selector */}
        <select
          value={track.instrument}
          onChange={(e) =>
            onInstrumentChange?.(track.id, e.target.value as InstrumentType)
          }
          onClick={(e) => e.stopPropagation()}
          className="h-5 flex-1 rounded bg-slate-800 text-[10px] text-slate-400 border-none outline-none cursor-pointer"
        >
          {INSTRUMENT_OPTIONS.map((inst) => (
            <option key={inst} value={inst}>
              {INSTRUMENT_LABELS[inst]}
            </option>
          ))}
        </select>

        {/* Volume slider */}
        <div className="w-16" onClick={(e) => e.stopPropagation()}>
          <Slider
            min={0}
            max={100}
            step={1}
            value={Math.round(track.volume * 100)}
            onChange={(e) =>
              onVolumeChange?.(track.id, Number(e.target.value) / 100)
            }
            className="h-1"
          />
        </div>
      </div>
    </div>
  );
}
