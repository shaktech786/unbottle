"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { velocityToHeight, heightToVelocity } from "@/lib/music/velocity";
import type { Note } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";

interface VelocityLaneProps {
  notes: Note[];
  selectedNotes: Set<string>;
  totalBars: number;
  width: number;
  scrollX: number;
  onUpdateVelocity: (noteId: string, velocity: number) => void;
  className?: string;
}

const LANE_HEIGHT = 60;

export function VelocityLane({
  notes,
  selectedNotes,
  totalBars,
  width,
  scrollX,
  onUpdateVelocity,
  className,
}: VelocityLaneProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const activeNoteId = useRef<string | null>(null);

  const totalTicks = totalBars * 4 * PPQ;
  const pxPerTick = width / totalTicks;

  const getNoteAtX = useCallback(
    (clientX: number): Note | null => {
      if (!canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = clientX - rect.left + scrollX;

      // Find the note whose tick range includes x
      for (const note of notes) {
        const noteX = note.startTick * pxPerTick;
        const noteW = Math.max(note.durationTicks * pxPerTick, 4);
        if (x >= noteX && x <= noteX + noteW) {
          return note;
        }
      }
      return null;
    },
    [notes, pxPerTick, scrollX],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const note = getNoteAtX(e.clientX);
      if (!note) return;

      isDragging.current = true;
      activeNoteId.current = note.id;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // Compute velocity from Y position
      const rect = canvasRef.current!.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = LANE_HEIGHT - y;
      const velocity = heightToVelocity(Math.max(0, height), LANE_HEIGHT);
      onUpdateVelocity(note.id, velocity);
    },
    [getNoteAtX, onUpdateVelocity],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || !activeNoteId.current) return;

      const rect = canvasRef.current!.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = LANE_HEIGHT - y;
      const velocity = heightToVelocity(Math.max(0, height), LANE_HEIGHT);
      onUpdateVelocity(activeNoteId.current, velocity);
    },
    [onUpdateVelocity],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    activeNoteId.current = null;
  }, []);

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative border-t border-neutral-800 bg-[#080808] select-none cursor-crosshair overflow-hidden",
        className,
      )}
      style={{ height: LANE_HEIGHT, width }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Velocity bars */}
      {notes.map((note) => {
        const x = note.startTick * pxPerTick - scrollX;
        const barWidth = Math.max(note.durationTicks * pxPerTick, 4);
        const barHeight = velocityToHeight(note.velocity, LANE_HEIGHT);
        const isSelected = selectedNotes.has(note.id);

        // Skip notes entirely off-screen
        if (x + barWidth < 0 || x > width) return null;

        return (
          <div
            key={note.id}
            className="absolute bottom-0 transition-colors duration-100"
            style={{
              left: x,
              width: Math.max(barWidth - 1, 2),
              height: barHeight,
              backgroundColor: isSelected
                ? "rgba(245, 158, 11, 0.8)"
                : "rgba(99, 102, 241, 0.6)",
            }}
          />
        );
      })}

      {/* Label */}
      <span className="absolute left-1 top-0.5 text-[9px] text-neutral-600 pointer-events-none">
        Velocity
      </span>
    </div>
  );
}
