"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import type { NoteName } from "@/lib/music/types";

interface TransportControlsProps {
  bpm: number;
  keySignature: string;
  timeSignature: string;
  onBpmChange: (bpm: number) => void;
  onKeyChange: (key: string) => void;
  onTimeSignatureChange: (ts: string) => void;
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
}: TransportControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showKeyDropdown, setShowKeyDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const adjustBpm = useCallback(
    (delta: number) => {
      const next = Math.max(20, Math.min(300, bpm + delta));
      onBpmChange(next);
    },
    [bpm, onBpmChange],
  );

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-800 bg-slate-950 px-4">
      {/* Play/Stop */}
      <button
        onClick={togglePlay}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
          isPlaying
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-indigo-600 text-white hover:bg-indigo-500",
        )}
        aria-label={isPlaying ? "Stop" : "Play"}
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

      <div className="h-6 w-px bg-slate-800" />

      {/* BPM */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => adjustBpm(-1)}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Decrease BPM"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-500">BPM</span>
          <span className="text-sm font-mono font-semibold text-slate-100 tabular-nums">
            {bpm}
          </span>
        </div>
        <button
          onClick={() => adjustBpm(1)}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Increase BPM"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-slate-800" />

      {/* Key Signature */}
      <div className="relative">
        <button
          onClick={() => {
            setShowKeyDropdown(!showKeyDropdown);
            setShowTimeDropdown(false);
          }}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm hover:bg-slate-800"
        >
          <span className="text-xs text-slate-500">Key</span>
          <span className="font-medium text-slate-100">{keySignature}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showKeyDropdown && (
          <div className="absolute top-full left-0 z-50 mt-1 grid grid-cols-4 gap-0.5 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
            {ALL_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => {
                  onKeyChange(key);
                  setShowKeyDropdown(false);
                }}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  key === keySignature
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800",
                )}
              >
                {key}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-slate-800" />

      {/* Time Signature */}
      <div className="relative">
        <button
          onClick={() => {
            setShowTimeDropdown(!showTimeDropdown);
            setShowKeyDropdown(false);
          }}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm hover:bg-slate-800"
        >
          <span className="text-xs text-slate-500">Time</span>
          <span className="font-medium text-slate-100">{timeSignature}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showTimeDropdown && (
          <div className="absolute top-full left-0 z-50 mt-1 flex flex-col gap-0.5 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
            {TIME_SIGNATURES.map((ts) => (
              <button
                key={ts}
                onClick={() => {
                  onTimeSignatureChange(ts);
                  setShowTimeDropdown(false);
                }}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-colors",
                  ts === timeSignature
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800",
                )}
              >
                {ts}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-slate-800" />

      {/* Loop Toggle */}
      <button
        onClick={() => setIsLooping(!isLooping)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors",
          isLooping
            ? "bg-indigo-600/20 text-indigo-400"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
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
        <span className="text-xs font-medium">Loop</span>
      </button>
    </div>
  );
}
