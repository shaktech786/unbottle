"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type {
  InstrumentType,
  Note,
  NoteName,
  Pitch,
  Track,
} from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";
import { PianoRoll } from "./piano-roll";
import { PianoKeys } from "./piano-keys";
import { Timeline } from "./timeline";
import { TrackList } from "./track-list";
import { VelocityLane } from "./velocity-lane";

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
  onRemoveNote?: (noteId: string) => void;
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
  /** Clear all notes */
  onClearAll?: () => void;

  /** Update velocity for a single note */
  onUpdateVelocity?: (noteId: string, velocity: number) => void;

  className?: string;
}

export function SequencerPanel({
  tracks,
  notes,
  playheadTick = 0,
  scaleNotes,
  onAddNote,
  onSelectNote,
  onClearSelection,
  onMoveNote,
  onResizeNote,
  onRemoveNote,
  selectedNotes = new Set(),
  onAddTrack,
  onSelectTrack,
  onMuteToggle,
  onSoloToggle,
  onVolumeChange,
  onTrackNameChange,
  onTrackInstrumentChange,
  onSetPlayhead,
  onClearAll,
  onUpdateVelocity,
  className,
}: SequencerPanelProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(
    tracks[0]?.id ?? null,
  );
  const [snap, setSnap] = useState<SnapValue>("1/16");
  const [zoom, setZoom] = useState(1);
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.25;
  // Auto-expand bars to fit notes (4 beats per bar, PPQ ticks per beat)
  const maxNoteTick = notes.length > 0
    ? Math.max(...notes.map((n) => n.startTick + n.durationTicks))
    : 0;
  const barsNeeded = Math.ceil(maxNoteTick / (4 * PPQ)) + 4; // +4 buffer bars
  const [manualBars, setManualBars] = useState(16);
  const totalBars = Math.max(manualBars, barsNeeded, 16);
  const [pianoScrollY, setPianoScrollY] = useState(0);
  const [pianoScrollX, setPianoScrollX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PIANO_KEY_WIDTH = 64;

  // Measure container for dynamic roll dimensions
  const rollAreaRef = useRef<HTMLDivElement>(null);
  const [rollDims, setRollDims] = useState({ width: 600, height: 400 });

  useEffect(() => {
    function measure() {
      if (rollAreaRef.current) {
        const rect = rollAreaRef.current.getBoundingClientRect();
        setRollDims({
          width: Math.max(200, rect.width - PIANO_KEY_WIDTH),
          height: Math.max(200, rect.height),
        });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const rollWidth = rollDims.width;
  const rollHeight = rollDims.height;

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
        "flex flex-col border border-neutral-800 rounded-xl bg-[#0a0a0a] overflow-hidden",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-2">
        {/* Snap */}
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline text-xs text-neutral-500">Snap</span>
          <select
            value={snap}
            onChange={(e) => setSnap(e.target.value as SnapValue)}
            className="h-7 rounded bg-neutral-800 text-xs text-neutral-300 border border-neutral-700 outline-none cursor-pointer"
          >
            <option value="1/4">1/4</option>
            <option value="1/8">1/8</option>
            <option value="1/16">1/16</option>
            <option value="1/32">1/32</option>
          </select>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <span className="hidden sm:inline text-xs text-neutral-500">Zoom</span>
          <button
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= ZOOM_MIN}
            className="h-7 w-7 rounded bg-neutral-800 text-xs font-bold text-neutral-300 border border-neutral-700 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom out"
          >
            -
          </button>
          <span className="w-10 text-center text-xs font-mono text-neutral-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= ZOOM_MAX}
            className="h-7 w-7 rounded bg-neutral-800 text-xs font-bold text-neutral-300 border border-neutral-700 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            +
          </button>
        </div>

        {/* Bars */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-500">Bars</span>
          <input
            type="number"
            value={totalBars}
            onChange={(e) =>
              setManualBars(Math.max(1, Math.min(256, Number(e.target.value))))
            }
            min={1}
            max={256}
            className="w-12 h-7 rounded bg-neutral-800 text-center text-xs text-neutral-200 border border-neutral-700 focus:border-amber-500 outline-none"
          />
        </div>

        {/* Clear + Playhead position */}
        <div className="ml-auto flex items-center gap-3">
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="h-7 rounded bg-neutral-800 px-2 text-[10px] font-medium text-neutral-400 transition-colors hover:bg-red-900/40 hover:text-red-400"
              title="Clear all notes"
            >
              Clear
            </button>
          )}
          <span className="text-xs font-mono text-neutral-500">
            {Math.floor(playheadTick / (PPQ * 4)) + 1}:
            {(Math.floor(playheadTick / PPQ) % 4) + 1}:
            {Math.floor((playheadTick % PPQ) / (PPQ / 4))}
          </span>
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
              scrollX={pianoScrollX}
              width={rollWidth}
              zoom={zoom}
            />
          </div>

          {/* Piano keys + Piano roll */}
          <div ref={rollAreaRef} className="flex flex-1 overflow-hidden">
            <PianoKeys
              rowHeight={22}
              onKeyClick={undefined}
              scaleNotes={scaleNotes}
              scrollY={pianoScrollY}
              height={rollHeight}
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
              zoom={zoom}
              onZoomChange={setZoom}
              onAddNote={onAddNote}
              onSelectNote={onSelectNote}
              onClearSelection={onClearSelection}
              onMoveNote={onMoveNote}
              onResizeNote={onResizeNote}
              onRemoveNote={onRemoveNote}
              onScrollY={setPianoScrollY}
              onScrollX={setPianoScrollX}
            />
          </div>

          {/* Velocity lane below the piano roll */}
          {onUpdateVelocity && (
            <div className="flex shrink-0">
              <div style={{ width: PIANO_KEY_WIDTH }} className="shrink-0" />
              <VelocityLane
                notes={notes}
                selectedNotes={selectedNotes}
                totalBars={totalBars}
                width={rollWidth}
                scrollX={pianoScrollX}
                zoom={zoom}
                onUpdateVelocity={onUpdateVelocity}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
