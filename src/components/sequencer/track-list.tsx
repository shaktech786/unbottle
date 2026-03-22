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
  const isSingleTrack = tracks.length <= 1;

  // Single-track: minimal view with just instrument selector
  if (isSingleTrack) {
    const track = tracks[0];
    return (
      <div
        className={cn(
          "flex flex-col border-r border-neutral-800 bg-[#0a0a0a]",
          className,
        )}
        style={{ width: 140 }}
      >
        <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Track
          </span>
        </div>
        {track && (
          <div className="p-2">
            <select
              value={track.instrument}
              onChange={(e) =>
                onInstrumentChange?.(track.id, e.target.value as InstrumentType)
              }
              className="w-full h-7 rounded bg-neutral-800 text-xs text-neutral-300 border border-neutral-700 outline-none cursor-pointer px-1"
            >
              <option value="piano">Piano</option>
              <option value="electric_piano">Electric Piano</option>
              <option value="synth">Synth</option>
              <option value="pad">Pad</option>
              <option value="strings">Strings</option>
              <option value="organ">Organ</option>
              <option value="guitar_acoustic">Acoustic Guitar</option>
              <option value="guitar_electric">Electric Guitar</option>
              <option value="bass_electric">Electric Bass</option>
              <option value="bass_synth">Synth Bass</option>
              <option value="brass">Brass</option>
              <option value="flute">Flute</option>
              <option value="saxophone">Saxophone</option>
              <option value="drums">Drums</option>
            </select>
          </div>
        )}
        <div className="flex-1" />
        <div className="border-t border-neutral-800 p-2">
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

  // Multi-track: full controls
  return (
    <div
      className={cn(
        "flex flex-col border-r border-neutral-800 bg-[#0a0a0a]",
        className,
      )}
      style={{ width: 200 }}
    >
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Tracks
        </span>
        <span className="text-xs text-neutral-500">{tracks.length}</span>
      </div>

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
      </ScrollArea>

      <div className="border-t border-neutral-800 p-2">
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
