"use client";

import type { ChordEvent } from "@/lib/music/types";
import { chordToString } from "@/lib/music/types";
import { cn } from "@/lib/utils/cn";

interface ChordDisplayProps {
  chordProgression: ChordEvent[];
  className?: string;
}

export function ChordDisplay({ chordProgression, className }: ChordDisplayProps) {
  if (chordProgression.length === 0) {
    return (
      <p className={cn("text-xs italic text-neutral-500", className)}>
        No chords yet
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {chordProgression.map((event, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-xs font-mono"
        >
          <span className="font-semibold text-amber-300">
            {chordToString(event.chord)}
          </span>
          <span className="text-neutral-500">
            {event.durationBars}b
          </span>
        </span>
      ))}
    </div>
  );
}
