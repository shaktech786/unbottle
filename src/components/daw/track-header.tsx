"use client";

import { type CSSProperties, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { TimelineTrack } from "@/lib/timeline/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TrackHeaderProps {
  track: TimelineTrack;
  isSelected?: boolean;
  onSelect?: (trackId: string) => void;
  onMute?: (trackId: string) => void;
  onSolo?: (trackId: string) => void;
  onArm?: (trackId: string) => void;
  onNameChange?: (trackId: string, name: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrackHeader({
  track,
  isSelected = false,
  onSelect,
  onMute,
  onSolo,
  onArm,
  onNameChange,
}: TrackHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(track.name);

  function commitName() {
    setEditing(false);
    const next = editName.trim();
    if (next.length > 0 && next !== track.name) {
      onNameChange?.(track.id, next);
    } else {
      setEditName(track.name);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col justify-between px-2 py-1 border-b border-neutral-800 cursor-pointer select-none",
        isSelected ? "bg-neutral-800/70" : "bg-[#0d0d0d] hover:bg-neutral-800/40",
      )}
      style={{ height: track.laneHeight }}
      onClick={() => onSelect?.(track.id)}
    >
      {/* Top row: color dot + name */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: track.color }}
        />

        {editing ? (
          <input
            type="text"
            value={editName}
            autoFocus
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setEditing(false);
                setEditName(track.name);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-xs bg-transparent text-neutral-200 border-b border-amber-500 outline-none py-0 px-0"
          />
        ) : (
          <span
            className="flex-1 min-w-0 text-xs font-medium text-neutral-300 truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
              setEditName(track.name);
            }}
          >
            {track.name}
          </span>
        )}
      </div>

      {/* Bottom row: type badge + control buttons */}
      <div className="flex items-center gap-1">
        {/* Track type badge */}
        <span className="text-[9px] uppercase tracking-wider text-neutral-600 font-medium mr-auto">
          {track.type}
        </span>

        {/* Mute */}
        <button
          type="button"
          title="Mute"
          onClick={(e) => { e.stopPropagation(); onMute?.(track.id); }}
          className={cn(
            "h-5 w-5 rounded text-[9px] font-bold transition-colors shrink-0",
            track.muted
              ? "bg-red-600 text-white"
              : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600",
          )}
        >
          M
        </button>

        {/* Solo */}
        <button
          type="button"
          title="Solo"
          onClick={(e) => { e.stopPropagation(); onSolo?.(track.id); }}
          className={cn(
            "h-5 w-5 rounded text-[9px] font-bold transition-colors shrink-0",
            track.solo
              ? "bg-amber-500 text-neutral-900"
              : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600",
          )}
        >
          S
        </button>

        {/* Record arm */}
        <button
          type="button"
          title="Record arm"
          onClick={(e) => { e.stopPropagation(); onArm?.(track.id); }}
          className={cn(
            "h-5 w-5 rounded text-[9px] font-bold transition-colors shrink-0",
            track.armed
              ? "bg-rose-600 text-white animate-pulse"
              : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600",
          )}
        >
          R
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrackHeaderList — renders a stacked column of headers
// ---------------------------------------------------------------------------

export interface TrackHeaderListProps {
  tracks: TimelineTrack[];
  selectedTrackId?: string | null;
  onSelect?: (trackId: string) => void;
  onMute?: (trackId: string) => void;
  onSolo?: (trackId: string) => void;
  onArm?: (trackId: string) => void;
  onNameChange?: (trackId: string, name: string) => void;
  /** Height reserved for the ruler above the tracks (px). */
  rulerHeight?: number;
  style?: CSSProperties;
  className?: string;
}

export function TrackHeaderList({
  tracks,
  selectedTrackId,
  onSelect,
  onMute,
  onSolo,
  onArm,
  onNameChange,
  rulerHeight = 28,
  style,
  className,
}: TrackHeaderListProps) {
  const sorted = [...tracks].sort((a, b) => a.laneIndex - b.laneIndex);

  return (
    <div className={cn("flex flex-col shrink-0", className)} style={style}>
      {/* Spacer matching the ruler height */}
      <div
        className="shrink-0 border-b border-neutral-800 bg-[#0d0d0d]"
        style={{ height: rulerHeight }}
      />

      {/* One header per track */}
      {sorted.map((track) => (
        <TrackHeader
          key={track.id}
          track={track}
          isSelected={track.id === selectedTrackId}
          onSelect={onSelect}
          onMute={onMute}
          onSolo={onSolo}
          onArm={onArm}
          onNameChange={onNameChange}
        />
      ))}
    </div>
  );
}
