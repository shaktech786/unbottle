"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type {
  InstrumentType,
  Note,
  NoteName,
  Pitch,
  Track,
} from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";
import { Button } from "@/components/ui/button";
import { PianoRoll } from "./piano-roll";
import { PianoKeys } from "./piano-keys";
import { Timeline } from "./timeline";
import { TrackList } from "./track-list";

type SnapValue = "1/4" | "1/8" | "1/16" | "1/32";

const TRACK_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f43f5e", // rose
  "#3b82f6", // blue
];

export interface SequencerPanelProps {
  tracks: Track[];
  notes: Note[];
  bpm?: number;
  playheadTick?: number;
  isPlaying?: boolean;
  scaleNotes?: Set<NoteName>;

  // Note operations
  onAddNote?: (note: Omit<Note, "id">) => void;
  onSelectNote?: (noteId: string, additive: boolean) => void;
  onClearSelection?: () => void;
  onMoveNote?: (noteId: string, newStartTick: number, newPitch: Pitch) => void;
  onResizeNote?: (noteId: string, newDuration: number) => void;
  selectedNotes?: Set<string>;

  // Track operations
  onAddTrack?: () => void;
  onSelectTrack?: (trackId: string) => void;
  onMuteToggle?: (trackId: string) => void;
  onSoloToggle?: (trackId: string) => void;
  onVolumeChange?: (trackId: string, volume: number) => void;
  onTrackNameChange?: (trackId: string, name: string) => void;
  onTrackInstrumentChange?: (
    trackId: string,
    instrument: InstrumentType,
  ) => void;

  // Transport
  onPlay?: () => void;
  onStop?: () => void;
  onSetPlayhead?: (tick: number) => void;
  onSetBpm?: (bpm: number) => void;

  className?: string;
}

export function SequencerPanel({
  tracks,
  notes,
  bpm = 120,
  playheadTick = 0,
  isPlaying = false,
  scaleNotes,
  onAddNote,
  onSelectNote,
  onClearSelection,
  onMoveNote,
  onResizeNote,
  selectedNotes = new Set(),
  onAddTrack,
  onSelectTrack,
  onMuteToggle,
  onSoloToggle,
  onVolumeChange,
  onTrackNameChange,
  onTrackInstrumentChange,
  onPlay,
  onStop,
  onSetPlayhead,
  onSetBpm,
  className,
}: SequencerPanelProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(
    tracks[0]?.id ?? null,
  );
  const [snap, setSnap] = useState<SnapValue>("1/16");
  const [totalBars, setTotalBars] = useState(16);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track list width and piano key width
  const TRACK_LIST_WIDTH = 200;
  const PIANO_KEY_WIDTH = 64;
  // Reserve width for piano roll
  const rollWidth =
    typeof window !== "undefined"
      ? Math.max(400, (containerRef.current?.clientWidth ?? 900) - TRACK_LIST_WIDTH - PIANO_KEY_WIDTH)
      : 600;
  const rollHeight = 400;

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const activeTrackColor = selectedTrack?.color ?? TRACK_COLORS[0];

  function handleSelectTrack(trackId: string) {
    setSelectedTrackId(trackId);
    onSelectTrack?.(trackId);
  }

  function handleAddTrack() {
    onAddTrack?.();
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col border border-slate-800 rounded-xl bg-slate-950 overflow-hidden",
        className,
      )}
    >
      {/* Transport bar */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-2">
        {/* Play/Stop */}
        <Button
          variant={isPlaying ? "danger" : "primary"}
          size="sm"
          onClick={isPlaying ? onStop : onPlay}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="12" height="16" rx="2" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
          {isPlaying ? "Stop" : "Play"}
        </Button>

        {/* BPM */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">BPM</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => onSetBpm?.(Number(e.target.value))}
            min={20}
            max={300}
            className="w-14 h-7 rounded bg-slate-800 text-center text-xs text-slate-200 border border-slate-700 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Snap */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Snap</span>
          <select
            value={snap}
            onChange={(e) => setSnap(e.target.value as SnapValue)}
            className="h-7 rounded bg-slate-800 text-xs text-slate-300 border border-slate-700 outline-none cursor-pointer"
          >
            <option value="1/4">1/4</option>
            <option value="1/8">1/8</option>
            <option value="1/16">1/16</option>
            <option value="1/32">1/32</option>
          </select>
        </div>

        {/* Bars */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Bars</span>
          <input
            type="number"
            value={totalBars}
            onChange={(e) =>
              setTotalBars(Math.max(1, Math.min(64, Number(e.target.value))))
            }
            min={1}
            max={64}
            className="w-12 h-7 rounded bg-slate-800 text-center text-xs text-slate-200 border border-slate-700 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Playhead position */}
        <div className="ml-auto text-xs font-mono text-slate-500">
          {Math.floor(playheadTick / (PPQ * 4)) + 1}:
          {(Math.floor(playheadTick / PPQ) % 4) + 1}:
          {Math.floor((playheadTick % PPQ) / (PPQ / 4))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track list (left) */}
        <TrackList
          tracks={tracks}
          selectedTrackId={selectedTrackId}
          onSelectTrack={handleSelectTrack}
          onMuteToggle={onMuteToggle}
          onSoloToggle={onSoloToggle}
          onVolumeChange={onVolumeChange}
          onNameChange={onTrackNameChange}
          onInstrumentChange={onTrackInstrumentChange}
          onAddTrack={handleAddTrack}
        />

        {/* Piano keys + roll area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Timeline */}
          <div className="flex">
            {/* Spacer for piano keys width */}
            <div style={{ width: PIANO_KEY_WIDTH }} className="shrink-0" />
            <Timeline
              pxPerTick={rollWidth / (totalBars * 4 * PPQ)}
              totalTicks={totalBars * 4 * PPQ}
              playheadTick={playheadTick}
              onSetPlayhead={onSetPlayhead}
              width={rollWidth}
            />
          </div>

          {/* Piano keys + Piano roll */}
          <div className="flex flex-1 overflow-hidden">
            <PianoKeys
              rowHeight={14}
              onKeyClick={undefined}
              scaleNotes={scaleNotes}
            />
            <PianoRoll
              notes={notes}
              selectedNotes={selectedNotes}
              activeTrackId={selectedTrackId ?? "default"}
              activeTrackColor={activeTrackColor}
              totalBars={totalBars}
              snap={snap}
              playheadTick={playheadTick}
              scaleNotes={scaleNotes}
              width={rollWidth}
              height={rollHeight}
              onAddNote={onAddNote}
              onSelectNote={onSelectNote}
              onClearSelection={onClearSelection}
              onMoveNote={onMoveNote}
              onResizeNote={onResizeNote}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
