"use client";

import { useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { NoteName } from "@/lib/music/types";

interface TransportControlsProps {
  bpm: number;
  keySignature: string;
  timeSignature: string;
  onBpmChange: (bpm: number) => void;
  onKeyChange: (key: string) => void;
  onTimeSignatureChange: (ts: string) => void;

  /** Tone.js player state -- when provided, overrides local isPlaying */
  isPlaying?: boolean;
  onPlay?: () => void;
  onStop?: () => void;

  /** Optional slot rendered at the far-right of the transport bar */
  trailing?: ReactNode;
}

const ALL_KEYS: NoteName[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

const TIME_SIGNATURES = ["3/4", "4/4", "5/4", "6/8", "7/8"];

export function TransportControls({
  bpm,
  keySignature,
  timeSignature,
  onBpmChange,
  onKeyChange,
  onTimeSignatureChange,
  isPlaying: externalIsPlaying,
  onPlay,
  onStop,
  trailing,
}: TransportControlsProps) {
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showKeyDropdown, setShowKeyDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // Use external state when provided, otherwise fall back to local state
  const isPlaying = externalIsPlaying ?? localIsPlaying;

  const togglePlay = useCallback(() => {
    if (externalIsPlaying !== undefined) {
      // Controlled externally via Tone.js
      if (isPlaying) {
        onStop?.();
      } else {
        onPlay?.();
      }
    } else {
      setLocalIsPlaying((prev) => !prev);
    }
  }, [externalIsPlaying, isPlaying, onPlay, onStop]);

  const handleStop = useCallback(() => {
    if (externalIsPlaying !== undefined) {
      onStop?.();
    } else {
      setLocalIsPlaying(false);
    }
  }, [externalIsPlaying, onStop]);

  const adjustBpm = useCallback(
    (delta: number) => {
      const next = Math.max(20, Math.min(300, bpm + delta));
      onBpmChange(next);
    },
    [bpm, onBpmChange],
  );

  return (
    <div className="relative z-10 flex h-14 shrink-0 items-center gap-1 border-b border-neutral-800/50 bg-[#0a0a0a] px-2 overflow-x-auto sm:gap-2 sm:px-3 md:gap-4 md:px-4">
      {/* Play/Stop group */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={togglePlay}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300",
            isPlaying
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              : "bg-emerald-600 text-white hover:bg-emerald-500",
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <button
          onClick={handleStop}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors duration-300 hover:bg-neutral-800/70 hover:text-neutral-200"
          aria-label="Stop"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-neutral-800/50" />

      {/* BPM - LED style */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => adjustBpm(-1)}
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors duration-300 hover:bg-neutral-800/70 hover:text-neutral-200"
          aria-label="Decrease BPM"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <div className="flex flex-col items-center rounded-md bg-neutral-900/80 px-2 py-0.5">
          <span className="text-[10px] uppercase tracking-widest text-neutral-600">BPM</span>
          <span className="font-mono text-sm font-bold tabular-nums text-amber-400">
            {bpm}
          </span>
        </div>
        <button
          onClick={() => adjustBpm(1)}
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors duration-300 hover:bg-neutral-800/70 hover:text-neutral-200"
          aria-label="Increase BPM"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-neutral-800/50" />

      {/* Key Signature */}
      <div className="relative">
        <button
          onClick={() => {
            setShowKeyDropdown(!showKeyDropdown);
            setShowTimeDropdown(false);
          }}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors duration-300 hover:bg-neutral-800/70"
        >
          <span className="text-xs text-neutral-500">Key</span>
          <span className="font-mono font-medium text-neutral-100">{keySignature}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showKeyDropdown && (
          <div className="absolute top-full left-0 z-50 mt-1 grid grid-cols-4 gap-0.5 rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-xl">
            {ALL_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => {
                  onKeyChange(key);
                  setShowKeyDropdown(false);
                }}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors duration-300",
                  key === keySignature
                    ? "bg-amber-500 text-white"
                    : "text-neutral-300 hover:bg-neutral-800",
                )}
              >
                {key}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-neutral-800/50" />

      {/* Time Signature */}
      <div className="relative">
        <button
          onClick={() => {
            setShowTimeDropdown(!showTimeDropdown);
            setShowKeyDropdown(false);
          }}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors duration-300 hover:bg-neutral-800/70"
        >
          <span className="text-xs text-neutral-500">Time</span>
          <span className="font-mono font-medium text-neutral-100">{timeSignature}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showTimeDropdown && (
          <div className="absolute top-full left-0 z-50 mt-1 flex flex-col gap-0.5 rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-xl">
            {TIME_SIGNATURES.map((ts) => (
              <button
                key={ts}
                onClick={() => {
                  onTimeSignatureChange(ts);
                  setShowTimeDropdown(false);
                }}
                className={cn(
                  "rounded px-3 py-1 font-mono text-xs font-medium transition-colors duration-300",
                  ts === timeSignature
                    ? "bg-amber-500 text-white"
                    : "text-neutral-300 hover:bg-neutral-800",
                )}
              >
                {ts}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-neutral-800/50" />

      {/* Loop Toggle */}
      <button
        onClick={() => setIsLooping(!isLooping)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors duration-300",
          isLooping
            ? "bg-cyan-500/20 text-cyan-400"
            : "text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-200",
        )}
        aria-label={isLooping ? "Disable loop" : "Enable loop"}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <span className="hidden text-xs font-medium sm:inline">Loop</span>
      </button>

      {/* Trailing slot (export button, etc.) */}
      {trailing && (
        <>
          <div className="h-6 w-px bg-neutral-800/50" />
          {trailing}
        </>
      )}
    </div>
  );
}
