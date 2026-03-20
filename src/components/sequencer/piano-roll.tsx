"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils/cn";
import type { Note, NoteName, Octave, Pitch } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";

// ── Constants ────────────────────────────────────────────────

const NOTE_NAMES: NoteName[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];
const BLACK_KEYS = new Set<NoteName>(["C#", "D#", "F#", "G#", "A#"]);

type SnapValue = "1/4" | "1/8" | "1/16" | "1/32";

const SNAP_TICKS: Record<SnapValue, number> = {
  "1/4": PPQ,
  "1/8": PPQ / 2,
  "1/16": PPQ / 4,
  "1/32": PPQ / 8,
};

type DragMode = "none" | "move" | "resize" | "draw";

interface DragState {
  mode: DragMode;
  noteId: string | null;
  origStartTick: number;
  origPitchIndex: number;
  origDuration: number;
  startX: number;
  startY: number;
}

const ROW_HEIGHT = 22;

// ── Props ────────────────────────────────────────────────────

export interface PianoRollProps {
  notes: Note[];
  selectedNotes: Set<string>;
  activeTrackId: string;
  activeTrackColor?: string;
  minOctave?: Octave;
  maxOctave?: Octave;
  totalBars?: number;
  beatsPerBar?: number;
  snap?: SnapValue;
  playheadTick?: number;
  scaleNotes?: Set<NoteName>;
  width?: number;
  height?: number;

  onAddNote?: (note: Omit<Note, "id">) => void;
  onSelectNote?: (noteId: string, additive: boolean) => void;
  onClearSelection?: () => void;
  onMoveNote?: (noteId: string, newStartTick: number, newPitch: Pitch) => void;
  onResizeNote?: (noteId: string, newDuration: number) => void;
  onRemoveNote?: (noteId: string) => void;
  /** Called when vertical scroll changes so parent can sync PianoKeys */
  onScrollY?: (scrollY: number) => void;

  className?: string;
}

// ── Helpers (pure, no closures) ──────────────────────────────

function buildPitchList(minOctave: Octave, maxOctave: Octave): Pitch[] {
  const list: Pitch[] = [];
  for (let oct = minOctave; oct <= maxOctave; oct++) {
    for (const name of NOTE_NAMES) {
      list.push(`${name}${oct}` as Pitch);
    }
  }
  return list;
}

function yToPitchIndex(y: number, sy: number, totalRows: number): number {
  const row = Math.floor((y + sy) / ROW_HEIGHT);
  return totalRows - 1 - row;
}

function xToTick(x: number, sx: number, pxPerTick: number): number {
  return Math.max(0, (x + sx) / pxPerTick);
}

function snapToGrid(tick: number, snapTicks: number): number {
  return Math.round(tick / snapTicks) * snapTicks;
}

function pitchIndexToY(index: number, sy: number, totalRows: number): number {
  return (totalRows - 1 - index) * ROW_HEIGHT - sy;
}

function tickToX(tick: number, pxPerTick: number, sx: number): number {
  return tick * pxPerTick - sx;
}

// ── Component ────────────────────────────────────────────────

export function PianoRoll({
  notes,
  selectedNotes,
  activeTrackId,
  activeTrackColor = "#6366f1",
  minOctave = 1,
  maxOctave = 7,
  totalBars = 16,
  beatsPerBar = 4,
  snap = "1/16",
  playheadTick = 0,
  scaleNotes,
  width = 800,
  height = 500,
  onAddNote,
  onSelectNote,
  onClearSelection,
  onMoveNote,
  onResizeNote,
  onRemoveNote,
  onScrollY,
  className,
}: PianoRollProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState>({
    mode: "none",
    noteId: null,
    origStartTick: 0,
    origPitchIndex: 0,
    origDuration: 0,
    startX: 0,
    startY: 0,
  });

  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const hasCenteredRef = useRef(false);

  // Center on C4 once we have real dimensions
  useEffect(() => {
    if (hasCenteredRef.current || height < 100) return;
    const pitchList = buildPitchList(minOctave, maxOctave);
    const c4Index = pitchList.indexOf("C4" as Pitch);
    if (c4Index < 0) return;
    const c4Row = pitchList.length - 1 - c4Index;
    const targetY = c4Row * ROW_HEIGHT - height / 2;
    const maxScroll = pitchList.length * ROW_HEIGHT - height;
    const clamped = Math.max(0, Math.min(maxScroll, targetY));
    setScrollY(clamped);
    hasCenteredRef.current = true;
  }, [height, minOctave, maxOctave]);

  // Notify parent when scrollY changes so PianoKeys stays aligned
  useEffect(() => {
    onScrollY?.(scrollY);
  }, [scrollY, onScrollY]);

  const pitches = buildPitchList(minOctave, maxOctave);
  const totalRows = pitches.length;
  const snapTicks = SNAP_TICKS[snap];
  const totalTicks = totalBars * beatsPerBar * PPQ;
  const pxPerTick = width / totalTicks;
  const contentHeight = totalRows * ROW_HEIGHT;
  const contentWidth = totalTicks * pxPerTick;

  // Hit-test a note at canvas coordinates
  function noteAtPosition(
    cx: number,
    cy: number,
  ): { note: Note; isResizeZone: boolean } | null {
    const tick = xToTick(cx, scrollX, pxPerTick);
    const pitchIdx = yToPitchIndex(cy, scrollY, totalRows);
    if (pitchIdx < 0 || pitchIdx >= pitches.length) return null;

    for (const note of notes) {
      const noteIdx = pitches.indexOf(note.pitch);
      if (noteIdx !== pitchIdx) continue;

      if (tick >= note.startTick && tick <= note.startTick + note.durationTicks) {
        const noteEndX = tickToX(note.startTick + note.durationTicks, pxPerTick, scrollX);
        const isResizeZone = cx > noteEndX - 6;
        return { note, isResizeZone };
      }
    }
    return null;
  }

  // ── Drawing (useEffect, no useCallback) ────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, width, height);

    // Row backgrounds (warmer palette)
    for (let i = 0; i < totalRows; i++) {
      const pitchIdx = totalRows - 1 - i;
      const y = i * ROW_HEIGHT - scrollY;
      if (y + ROW_HEIGHT < 0 || y > height) continue;

      const noteName = NOTE_NAMES[pitchIdx % 12];
      const isBlack = BLACK_KEYS.has(noteName);
      const isC = noteName === "C";
      const isInScale = scaleNotes?.has(noteName);

      if (isInScale) {
        ctx.fillStyle = isBlack ? "#1a1500" : "#1a150030";
      } else {
        ctx.fillStyle = isBlack ? "#0a0a0a" : "#141414";
      }
      ctx.fillRect(0, y, width, ROW_HEIGHT);

      // Stronger line on C notes for orientation
      ctx.strokeStyle = isC ? "#333333" : "#1a1a1a";
      ctx.lineWidth = isC ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + ROW_HEIGHT);
      ctx.lineTo(width, y + ROW_HEIGHT);
      ctx.stroke();
    }

    // Vertical grid lines
    const ticksPerBeat = PPQ;
    const ticksPerBar = beatsPerBar * PPQ;

    for (let tick = 0; tick <= totalTicks; tick += snapTicks) {
      const x = tickToX(tick, pxPerTick, scrollX);
      if (x < 0 || x > width) continue;

      const isBar = tick % ticksPerBar === 0;
      const isBeat = tick % ticksPerBeat === 0;

      if (isBar) {
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
      } else if (isBeat) {
        ctx.strokeStyle = "#222222";
        ctx.lineWidth = 0.75;
      } else {
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Notes (bigger, rounder, more visible)
    for (const note of notes) {
      const pitchIdx = pitches.indexOf(note.pitch);
      if (pitchIdx === -1) continue;

      const x = tickToX(note.startTick, pxPerTick, scrollX);
      const y = pitchIndexToY(pitchIdx, scrollY, totalRows);
      const w = note.durationTicks * pxPerTick;
      const pad = 2;

      if (x + w < 0 || x > width || y + ROW_HEIGHT < 0 || y > height) continue;

      const isSelected = selectedNotes.has(note.id);
      const noteW = Math.max(4, w - pad * 2);
      const noteH = ROW_HEIGHT - pad * 2;

      // Fill
      ctx.fillStyle = isSelected ? "#fbbf24" : activeTrackColor;
      ctx.globalAlpha = 0.5 + (note.velocity / 127) * 0.5;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, noteW, noteH, 3);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Border
      ctx.strokeStyle = isSelected ? "#fcd34d" : activeTrackColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, noteW, noteH, 3);
      ctx.stroke();

      // Resize handle (right edge)
      if (noteW > 12) {
        ctx.fillStyle = isSelected ? "#fef3c7" : "#ffffff50";
        ctx.fillRect(x + pad + noteW - 4, y + pad + 4, 2, noteH - 8);
      }

      // Note label if wide enough
      if (noteW > 30) {
        ctx.fillStyle = isSelected ? "#451a03" : "#ffffff90";
        ctx.font = "10px monospace";
        ctx.fillText(note.pitch, x + pad + 4, y + pad + noteH / 2 + 3);
      }
    }

    // Playhead
    const playX = tickToX(playheadTick, pxPerTick, scrollX);
    if (playX >= 0 && playX <= width) {
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();
    }
  }, [
    width,
    height,
    scrollX,
    scrollY,
    notes,
    selectedNotes,
    playheadTick,
    totalRows,
    totalTicks,
    snapTicks,
    pxPerTick,
    pitches,
    beatsPerBar,
    scaleNotes,
    activeTrackColor,
  ]);

  // ── Mouse handlers ───────────────────────────────────────

  function handleMouseDown(e: ReactMouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const hit = noteAtPosition(cx, cy);

    if (hit) {
      const { note, isResizeZone } = hit;

      if (isResizeZone) {
        dragRef.current = {
          mode: "resize",
          noteId: note.id,
          origStartTick: note.startTick,
          origPitchIndex: pitches.indexOf(note.pitch),
          origDuration: note.durationTicks,
          startX: cx,
          startY: cy,
        };
      } else {
        dragRef.current = {
          mode: "move",
          noteId: note.id,
          origStartTick: note.startTick,
          origPitchIndex: pitches.indexOf(note.pitch),
          origDuration: note.durationTicks,
          startX: cx,
          startY: cy,
        };
      }

      onSelectNote?.(note.id, e.shiftKey);
    } else {
      dragRef.current = {
        mode: "draw",
        noteId: null,
        origStartTick: 0,
        origPitchIndex: 0,
        origDuration: 0,
        startX: cx,
        startY: cy,
      };
      onClearSelection?.();
    }
  }

  function handleMouseMove(e: ReactMouseEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (drag.mode === "none") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dx = cx - drag.startX;
    const dy = cy - drag.startY;

    if (drag.mode === "move" && drag.noteId) {
      const deltaTicks = snapToGrid(dx / pxPerTick, snapTicks);
      const deltaRows = Math.round(dy / ROW_HEIGHT);
      const newTick = Math.max(0, drag.origStartTick + deltaTicks);
      const newPitchIdx = Math.max(
        0,
        Math.min(pitches.length - 1, drag.origPitchIndex - deltaRows),
      );
      onMoveNote?.(drag.noteId, newTick, pitches[newPitchIdx]);
    }

    if (drag.mode === "resize" && drag.noteId) {
      const deltaTicks = snapToGrid(dx / pxPerTick, snapTicks);
      const newDuration = Math.max(snapTicks, drag.origDuration + deltaTicks);
      onResizeNote?.(drag.noteId, newDuration);
    }
  }

  function handleMouseUp(e: ReactMouseEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;

    if (drag.mode === "draw") {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const tick = snapToGrid(xToTick(cx, scrollX, pxPerTick), snapTicks);
      const pitchIdx = yToPitchIndex(cy, scrollY, totalRows);

      if (pitchIdx >= 0 && pitchIdx < pitches.length) {
        // Default to quarter note duration (more musical than snap-grid-sized)
        const defaultDuration = Math.max(snapTicks, PPQ);
        onAddNote?.({
          trackId: activeTrackId,
          pitch: pitches[pitchIdx],
          startTick: tick,
          durationTicks: defaultDuration,
          velocity: 100,
        });
      }
    }

    dragRef.current = {
      mode: "none",
      noteId: null,
      origStartTick: 0,
      origPitchIndex: 0,
      origDuration: 0,
      startX: 0,
      startY: 0,
    };
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (e.shiftKey) {
      setScrollX((prev) =>
        Math.max(0, Math.min(contentWidth - width, prev + e.deltaY)),
      );
    } else {
      setScrollY((prev) =>
        Math.max(0, Math.min(contentHeight - height, prev + e.deltaY)),
      );
    }
  }

  function handleMouseMovePassive(e: ReactMouseEvent<HTMLCanvasElement>) {
    if (dragRef.current.mode !== "none") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const hit = noteAtPosition(cx, cy);

    if (hit?.isResizeZone) {
      e.currentTarget.style.cursor = "col-resize";
    } else if (hit) {
      e.currentTarget.style.cursor = "grab";
    } else {
      e.currentTarget.style.cursor = "crosshair";
    }
  }

  function handleContextMenu(e: ReactMouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const hit = noteAtPosition(cx, cy);
    if (hit && onRemoveNote) {
      onRemoveNote(hit.note.id);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={cn("block", className)}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleMouseMovePassive(e);
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    />
  );
}
