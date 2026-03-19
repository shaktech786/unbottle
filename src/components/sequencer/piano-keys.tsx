"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import type { NoteName, Octave, Pitch } from "@/lib/music/types";

const NOTE_NAMES: NoteName[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

const BLACK_KEYS = new Set<NoteName>(["C#", "D#", "F#", "G#", "A#"]);

export interface PianoKeysProps {
  /** Height of each pitch row in px (must match the piano roll row height). */
  rowHeight: number;
  /** Lowest octave displayed. */
  minOctave?: Octave;
  /** Highest octave displayed. */
  maxOctave?: Octave;
  /** Notes in the current scale to highlight. */
  scaleNotes?: Set<NoteName>;
  /** Callback when a key is clicked (for previewing sound). */
  onKeyClick?: (pitch: Pitch) => void;
  /** Vertical scroll offset. */
  scrollY?: number;
  className?: string;
}

/**
 * Vertical piano keyboard rendered on the left side of the piano roll.
 * Keys are ordered top-to-bottom from high to low pitch.
 */
export function PianoKeys({
  rowHeight,
  minOctave = 1,
  maxOctave = 7,
  scaleNotes,
  onKeyClick,
  scrollY = 0,
  className,
}: PianoKeysProps) {
  // Build the list of pitches from high to low
  const pitches: { pitch: Pitch; noteName: NoteName; octave: Octave }[] = [];
  for (let oct = maxOctave; oct >= minOctave; oct--) {
    for (let i = NOTE_NAMES.length - 1; i >= 0; i--) {
      pitches.push({
        pitch: `${NOTE_NAMES[i]}${oct}` as Pitch,
        noteName: NOTE_NAMES[i],
        octave: oct as Octave,
      });
    }
  }

  const handleKeyClick = useCallback(
    (pitch: Pitch) => {
      onKeyClick?.(pitch);
    },
    [onKeyClick],
  );

  const totalHeight = pitches.length * rowHeight;

  return (
    <div
      className={cn("relative flex-shrink-0 overflow-hidden", className)}
      style={{ width: 64, height: "100%" }}
    >
      <div
        className="absolute left-0 top-0 w-full"
        style={{
          height: totalHeight,
          transform: `translateY(${-scrollY}px)`,
        }}
      >
        {pitches.map(({ pitch, noteName, octave }) => {
          const isBlack = BLACK_KEYS.has(noteName);
          const isC = noteName === "C";
          const isInScale = scaleNotes?.has(noteName);

          return (
            <button
              key={pitch}
              type="button"
              onClick={() => handleKeyClick(pitch)}
              className={cn(
                "flex w-full items-center border-b border-slate-800/50 transition-colors",
                "text-[10px] leading-none select-none",
                isBlack
                  ? "bg-slate-900 text-slate-500 hover:bg-slate-800"
                  : "bg-slate-800/30 text-slate-400 hover:bg-slate-700/50",
                isInScale && !isBlack && "bg-indigo-950/30",
                isInScale && isBlack && "bg-indigo-950/50",
              )}
              style={{ height: rowHeight }}
              title={pitch}
            >
              <span className="pl-1.5 truncate">
                {isC ? `C${octave}` : isBlack ? "" : ""}
              </span>
              {isBlack && (
                <span
                  className="ml-auto mr-1 h-[60%] w-6 rounded-sm bg-slate-700"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
