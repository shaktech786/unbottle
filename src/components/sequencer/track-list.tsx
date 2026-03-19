"use client";

import { cn } from "@/lib/utils/cn";
import type { InstrumentType, Track } from "@/lib/music/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrackRow } from "./track-row";

export interface TrackListProps {
  tracks: Track[];
  selectedTrackId?: string | null;
  onSelectTrack?: (trackId: string) => void;
  onMuteToggle?: (trackId: string) => void;
  onSoloToggle?: (trackId: string) => void;
  onVolumeChange?: (trackId: string, volume: number) => void;
  onNameChange?: (trackId: string, name: string) => void;
  onInstrumentChange?: (trackId: string, instrument: InstrumentType) => void;
  onAddTrack?: () => void;
  className?: string;
}

/**
 * List of tracks on the left side of the sequencer.
 */
export function TrackList({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onMuteToggle,
  onSoloToggle,
  onVolumeChange,
  onNameChange,
  onInstrumentChange,
  onAddTrack,
  className,
}: TrackListProps) {
  const sortedTracks = [...tracks].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div
      className={cn(
        "flex flex-col border-r border-slate-800 bg-slate-950",
        className,
      )}
      style={{ width: 200 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Tracks
        </span>
        <span className="text-xs text-slate-600">{tracks.length}</span>
      </div>

      {/* Track rows */}
      <ScrollArea className="flex-1">
        {sortedTracks.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            isSelected={track.id === selectedTrackId}
            onSelect={onSelectTrack}
            onMuteToggle={onMuteToggle}
            onSoloToggle={onSoloToggle}
            onVolumeChange={onVolumeChange}
            onNameChange={onNameChange}
            onInstrumentChange={onInstrumentChange}
          />
        ))}

        {tracks.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-600">
            No tracks yet
          </div>
        )}
      </ScrollArea>

      {/* Add track button */}
      <div className="border-t border-slate-800 p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddTrack}
          className="w-full text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Track
        </Button>
      </div>
    </div>
  );
}
