"use client";

import {
  useCallback,
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

const ROW_HEIGHT = 22;
const RESIZE_HANDLE_PX = 8;
const AUTO_SCROLL_ZONE = 40;
const AUTO_SCROLL_SPEED = 4;
const DEFAULT_VELOCITY = 100; // ~78% of 127

// ── Color Palette ────────────────────────────────────────────

const COLORS = {
  bg: "#0d0d0d",
  whiteRow: "#141414",
  blackRow: "#0a0a0a",
  cGridLine: "#333333",
  beatGridLine: "#222222",
  subBeatGridLine: "#1a1a1a",
  selectedNote: "#fbbf24",
  selectedBorder: "#fcd34d",
  selectedGlow: "rgba(251, 191, 36, 0.25)",
  selectedLabelBg: "#451a03",
  playhead: "#f97316",
  hoverRow: "rgba(255, 255, 255, 0.03)",
  resizeHandle: "rgba(255, 255, 255, 0.3)",
  resizeHandleSelected: "#fef3c7",
  noteLabel: "rgba(255, 255, 255, 0.56)",
  pitchLabel: "rgba(255, 255, 255, 0.7)",
  pitchLabelBg: "rgba(0, 0, 0, 0.75)",
} as const;

// ── Drag State ───────────────────────────────────────────────

type DragMode = "none" | "draw" | "move" | "resize" | "erase";

interface DragState {
  mode: DragMode;
  noteId: string | null;
  origStartTick: number;
  origPitchIndex: number;
  origDuration: number;
  startX: number;
  startY: number;
  drawStartTick: number;
  drawPitchIndex: number;
}

const DRAG_INITIAL: DragState = {
  mode: "none",
  noteId: null,
  origStartTick: 0,
  origPitchIndex: 0,
  origDuration: 0,
  startX: 0,
  startY: 0,
  drawStartTick: 0,
  drawPitchIndex: 0,
};

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

function snapFloor(tick: number, snapTicks: number): number {
  return Math.floor(tick / snapTicks) * snapTicks;
}

function pitchIndexToY(index: number, sy: number, totalRows: number): number {
  return (totalRows - 1 - index) * ROW_HEIGHT - sy;
}

function tickToX(tick: number, pxPerTick: number, sx: number): number {
  return tick * pxPerTick - sx;
}

/** Parse a hex color into [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
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
  const dragRef = useRef<DragState>({ ...DRAG_INITIAL });
  const autoScrollRaf = useRef<number>(0);

  // Compute initial scrollY to center on C4
  const pitchesForInit = buildPitchList(minOctave, maxOctave);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(() => {
    const c4Index = pitchesForInit.indexOf("C4" as Pitch);
    if (c4Index < 0 || height < 100) return 0;
    const c4Row = pitchesForInit.length - 1 - c4Index;
    const targetY = c4Row * ROW_HEIGHT - height / 2;
    const maxScroll = pitchesForInit.length * ROW_HEIGHT - height;
    return Math.max(0, Math.min(maxScroll, targetY));
  });
  const [pxPerTick, setPxPerTick] = useState<number | null>(null);

  // Hover state for ghost preview
  const [hoverCell, setHoverCell] = useState<{ tick: number; pitchIdx: number } | null>(null);
  // Current drag cursor pos (canvas-relative) for live drawing feedback
  const [dragCursor, setDragCursor] = useState<{ cx: number; cy: number } | null>(null);

  const pitches = buildPitchList(minOctave, maxOctave);
  const totalRows = pitches.length;
  const snapTicks = SNAP_TICKS[snap];
  const totalTicks = totalBars * beatsPerBar * PPQ;
  const defaultPxPerTick = width / totalTicks;
  const activePxPerTick = pxPerTick ?? defaultPxPerTick;
  const contentHeight = totalRows * ROW_HEIGHT;
  const contentWidth = totalTicks * activePxPerTick;

  // Notify parent when scrollY changes
  useEffect(() => {
    onScrollY?.(scrollY);
  }, [scrollY, onScrollY]);

  // ── Hit-test ───────────────────────────────────────────────

  const noteAtPosition = useCallback(
    (cx: number, cy: number): { note: Note; isResizeZone: boolean } | null => {
      const tick = xToTick(cx, scrollX, activePxPerTick);
      const pitchIdx = yToPitchIndex(cy, scrollY, totalRows);
      if (pitchIdx < 0 || pitchIdx >= pitches.length) return null;

      for (const note of notes) {
        const noteIdx = pitches.indexOf(note.pitch);
        if (noteIdx !== pitchIdx) continue;

        if (tick >= note.startTick && tick <= note.startTick + note.durationTicks) {
          const noteEndX = tickToX(note.startTick + note.durationTicks, activePxPerTick, scrollX);
          const isResizeZone = cx > noteEndX - RESIZE_HANDLE_PX;
          return { note, isResizeZone };
        }
      }
      return null;
    },
    [scrollX, scrollY, activePxPerTick, totalRows, pitches, notes],
  );

  // ── Auto-scroll ────────────────────────────────────────────

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRaf.current) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = 0;
    }
  }, []);

  const runAutoScroll = useCallback(
    (cx: number, cy: number) => {
      stopAutoScroll();

      let dx = 0;
      let dy = 0;

      if (cx < AUTO_SCROLL_ZONE) dx = -AUTO_SCROLL_SPEED;
      else if (cx > width - AUTO_SCROLL_ZONE) dx = AUTO_SCROLL_SPEED;
      if (cy < AUTO_SCROLL_ZONE) dy = -AUTO_SCROLL_SPEED;
      else if (cy > height - AUTO_SCROLL_ZONE) dy = AUTO_SCROLL_SPEED;

      if (dx === 0 && dy === 0) return;

      const step = () => {
        setScrollX((prev) => Math.max(0, Math.min(contentWidth - width, prev + dx)));
        setScrollY((prev) => Math.max(0, Math.min(contentHeight - height, prev + dy)));
        autoScrollRaf.current = requestAnimationFrame(step);
      };
      autoScrollRaf.current = requestAnimationFrame(step);
    },
    [stopAutoScroll, width, height, contentWidth, contentHeight],
  );

  // Clean up auto-scroll on unmount
  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  // ── Drawing (Canvas Render) ────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const drag = dragRef.current;
    const [trackR, trackG, trackB] = hexToRgb(activeTrackColor);

    // ── Background ──
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // ── Row backgrounds ──
    for (let i = 0; i < totalRows; i++) {
      const pitchIdx = totalRows - 1 - i;
      const y = i * ROW_HEIGHT - scrollY;
      if (y + ROW_HEIGHT < 0 || y > height) continue;

      const noteName = NOTE_NAMES[pitchIdx % 12];
      const isBlack = BLACK_KEYS.has(noteName);
      const isC = noteName === "C";
      const isInScale = scaleNotes?.has(noteName);

      // Row fill
      if (isInScale) {
        ctx.fillStyle = isBlack ? "#1a1500" : "#1a150030";
      } else {
        ctx.fillStyle = isBlack ? COLORS.blackRow : COLORS.whiteRow;
      }
      ctx.fillRect(0, y, width, ROW_HEIGHT);

      // Hover row highlight
      if (hoverCell && hoverCell.pitchIdx === pitchIdx && drag.mode === "none") {
        ctx.fillStyle = COLORS.hoverRow;
        ctx.fillRect(0, y, width, ROW_HEIGHT);
      }

      // Horizontal grid line
      ctx.strokeStyle = isC ? COLORS.cGridLine : COLORS.subBeatGridLine;
      ctx.lineWidth = isC ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + ROW_HEIGHT);
      ctx.lineTo(width, y + ROW_HEIGHT);
      ctx.stroke();
    }

    // ── Vertical grid lines ──
    const ticksPerBeat = PPQ;
    const ticksPerBar = beatsPerBar * PPQ;

    for (let tick = 0; tick <= totalTicks; tick += snapTicks) {
      const x = tickToX(tick, activePxPerTick, scrollX);
      if (x < 0 || x > width) continue;

      const isBar = tick % ticksPerBar === 0;
      const isBeat = tick % ticksPerBeat === 0;

      if (isBar) {
        ctx.strokeStyle = COLORS.cGridLine;
        ctx.lineWidth = 1;
      } else if (isBeat) {
        ctx.strokeStyle = COLORS.beatGridLine;
        ctx.lineWidth = 0.75;
      } else {
        ctx.strokeStyle = COLORS.subBeatGridLine;
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // ── Draw a single note (helper) ──
    // Accept ctx explicitly so TypeScript tracks the non-null narrowing
    function drawNote(
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      isSelected: boolean,
      velocity: number,
      label: string | null,
      alpha: number,
    ) {
      const pad = 2;
      const noteW = Math.max(4, w - pad * 2);
      const noteH = ROW_HEIGHT - pad * 2;
      const nx = x + pad;
      const ny = y + pad;

      c.save();
      c.globalAlpha = alpha;

      // Glow for selected
      if (isSelected) {
        c.shadowColor = COLORS.selectedGlow;
        c.shadowBlur = 8;
      }

      // Gradient fill
      const grad = c.createLinearGradient(nx, ny, nx, ny + noteH);
      if (isSelected) {
        grad.addColorStop(0, "#fcd34d");
        grad.addColorStop(1, "#f59e0b");
      } else {
        const lighten = (v: number) => Math.min(255, v + 40);
        grad.addColorStop(0, `rgb(${lighten(trackR)}, ${lighten(trackG)}, ${lighten(trackB)})`);
        grad.addColorStop(1, `rgb(${trackR}, ${trackG}, ${trackB})`);
      }

      const velAlpha = 0.5 + (velocity / 127) * 0.5;
      c.globalAlpha = alpha * velAlpha;
      c.fillStyle = grad;
      c.beginPath();
      c.roundRect(nx, ny, noteW, noteH, 3);
      c.fill();

      // Reset shadow before border
      c.shadowColor = "transparent";
      c.shadowBlur = 0;

      // Border
      c.globalAlpha = alpha;
      c.strokeStyle = isSelected ? COLORS.selectedBorder : activeTrackColor;
      c.lineWidth = isSelected ? 2 : 1;
      c.beginPath();
      c.roundRect(nx, ny, noteW, noteH, 3);
      c.stroke();

      // Resize handle
      if (noteW > 14) {
        c.fillStyle = isSelected ? COLORS.resizeHandleSelected : COLORS.resizeHandle;
        c.fillRect(nx + noteW - 4, ny + 4, 2, noteH - 8);
      }

      // Note label
      if (noteW > 30 && label) {
        c.fillStyle = isSelected ? COLORS.selectedLabelBg : COLORS.noteLabel;
        c.font = "10px monospace";
        c.fillText(label, nx + 4, ny + noteH / 2 + 3);
      }

      c.restore();
    }

    // ── Notes ──
    for (const note of notes) {
      const pitchIdx = pitches.indexOf(note.pitch);
      if (pitchIdx === -1) continue;

      const x = tickToX(note.startTick, activePxPerTick, scrollX);
      const y = pitchIndexToY(pitchIdx, scrollY, totalRows);
      const w = note.durationTicks * activePxPerTick;

      if (x + w < 0 || x > width || y + ROW_HEIGHT < 0 || y > height) continue;

      const isSelected = selectedNotes.has(note.id);

      // If this note is being moved, draw ghost at original position
      if (drag.mode === "move" && drag.noteId === note.id && dragCursor) {
        const origX = tickToX(drag.origStartTick, activePxPerTick, scrollX);
        const origY = pitchIndexToY(drag.origPitchIndex, scrollY, totalRows);
        drawNote(ctx, origX, origY, w, false, note.velocity, null, 0.2);
      }

      drawNote(ctx, x, y, w, isSelected, note.velocity, note.pitch, 1);
    }

    // ── Ghost note (hover preview) ──
    if (hoverCell && drag.mode === "none") {
      const gx = tickToX(hoverCell.tick, activePxPerTick, scrollX);
      const gy = pitchIndexToY(hoverCell.pitchIdx, scrollY, totalRows);
      const ghostW = snapTicks * activePxPerTick;
      drawNote(ctx, gx, gy, ghostW, false, DEFAULT_VELOCITY, null, 0.3);
    }

    // ── Draw-mode preview (note being drawn) ──
    if (drag.mode === "draw" && dragCursor) {
      const cursorTick = snapToGrid(
        xToTick(dragCursor.cx, scrollX, activePxPerTick),
        snapTicks,
      );
      const startTick = Math.min(drag.drawStartTick, cursorTick);
      const endTick = Math.max(drag.drawStartTick + snapTicks, cursorTick + snapTicks);
      const duration = endTick - startTick;

      const dx = tickToX(startTick, activePxPerTick, scrollX);
      const dy = pitchIndexToY(drag.drawPitchIndex, scrollY, totalRows);
      const dw = duration * activePxPerTick;
      drawNote(ctx, dx, dy, dw, false, DEFAULT_VELOCITY, pitches[drag.drawPitchIndex] ?? null, 0.7);

      // Pitch label near cursor
      if (drag.drawPitchIndex >= 0 && drag.drawPitchIndex < pitches.length) {
        const labelText = pitches[drag.drawPitchIndex];
        ctx.font = "bold 11px monospace";
        const metrics = ctx.measureText(labelText);
        const lx = dragCursor.cx + 12;
        const ly = dragCursor.cy - 8;
        ctx.fillStyle = COLORS.pitchLabelBg;
        ctx.fillRect(lx - 2, ly - 11, metrics.width + 6, 15);
        ctx.fillStyle = COLORS.pitchLabel;
        ctx.fillText(labelText, lx + 1, ly);
      }
    }

    // ── Move-mode pitch label ──
    if (drag.mode === "move" && drag.noteId && dragCursor) {
      const currentPitchIdx = yToPitchIndex(dragCursor.cy, scrollY, totalRows);
      const clampedIdx = Math.max(0, Math.min(pitches.length - 1, currentPitchIdx));
      const labelText = pitches[clampedIdx];
      if (labelText) {
        ctx.font = "bold 11px monospace";
        const metrics = ctx.measureText(labelText);
        const lx = dragCursor.cx + 12;
        const ly = dragCursor.cy - 8;
        ctx.fillStyle = COLORS.pitchLabelBg;
        ctx.fillRect(lx - 2, ly - 11, metrics.width + 6, 15);
        ctx.fillStyle = COLORS.pitchLabel;
        ctx.fillText(labelText, lx + 1, ly);
      }
    }

    // ── Playhead ──
    const playX = tickToX(playheadTick, activePxPerTick, scrollX);
    if (playX >= 0 && playX <= width) {
      // Line
      ctx.strokeStyle = COLORS.playhead;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();

      // Triangle at top
      ctx.fillStyle = COLORS.playhead;
      ctx.beginPath();
      ctx.moveTo(playX - 5, 0);
      ctx.lineTo(playX + 5, 0);
      ctx.lineTo(playX, 8);
      ctx.closePath();
      ctx.fill();
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
    activePxPerTick,
    pitches,
    beatsPerBar,
    scaleNotes,
    activeTrackColor,
    hoverCell,
    dragCursor,
  ]);

  // ── Mouse Handlers ─────────────────────────────────────────

  function handleMouseDown(e: ReactMouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Right-click starts erase mode
    if (e.button === 2) {
      const hit = noteAtPosition(cx, cy);
      if (hit) {
        onRemoveNote?.(hit.note.id);
      }
      dragRef.current = {
        ...DRAG_INITIAL,
        mode: "erase",
        startX: cx,
        startY: cy,
      };
      return;
    }

    // Left-click: check if we hit a note
    const hit = noteAtPosition(cx, cy);

    if (hit) {
      const { note, isResizeZone } = hit;

      if (isResizeZone) {
        dragRef.current = {
          ...DRAG_INITIAL,
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
          ...DRAG_INITIAL,
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
      // Empty space: start drawing a new note
      const tick = snapFloor(xToTick(cx, scrollX, activePxPerTick), snapTicks);
      const pitchIdx = yToPitchIndex(cy, scrollY, totalRows);

      if (pitchIdx >= 0 && pitchIdx < pitches.length) {
        dragRef.current = {
          ...DRAG_INITIAL,
          mode: "draw",
          startX: cx,
          startY: cy,
          drawStartTick: tick,
          drawPitchIndex: pitchIdx,
        };
        setDragCursor({ cx, cy });
      }

      if (!e.shiftKey) {
        onClearSelection?.();
      }
    }

    // Clear hover ghost during drag
    setHoverCell(null);
  }

  function handleMouseMove(e: ReactMouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const drag = dragRef.current;

    // ── Passive: cursor + ghost when no drag ──
    if (drag.mode === "none") {
      const hit = noteAtPosition(cx, cy);

      if (hit?.isResizeZone) {
        e.currentTarget.style.cursor = "col-resize";
      } else if (hit) {
        e.currentTarget.style.cursor = "grab";
      } else {
        e.currentTarget.style.cursor = "crosshair";
      }

      // Update ghost preview
      const pitchIdx = yToPitchIndex(cy, scrollY, totalRows);
      if (pitchIdx >= 0 && pitchIdx < pitches.length && !hit) {
        const tick = snapFloor(xToTick(cx, scrollX, activePxPerTick), snapTicks);
        setHoverCell({ tick, pitchIdx });
      } else {
        setHoverCell(null);
      }
      return;
    }

    // ── Active drag ──
    const dx = cx - drag.startX;
    const dy = cy - drag.startY;

    // Auto-scroll near edges
    runAutoScroll(cx, cy);

    if (drag.mode === "draw") {
      setDragCursor({ cx, cy });
      e.currentTarget.style.cursor = "crosshair";
    }

    if (drag.mode === "move" && drag.noteId) {
      const deltaTicks = snapToGrid(dx / activePxPerTick, snapTicks);
      const deltaRows = Math.round(dy / ROW_HEIGHT);
      const newTick = Math.max(0, drag.origStartTick + deltaTicks);
      const newPitchIdx = Math.max(
        0,
        Math.min(pitches.length - 1, drag.origPitchIndex - deltaRows),
      );
      onMoveNote?.(drag.noteId, newTick, pitches[newPitchIdx]);
      setDragCursor({ cx, cy });
      e.currentTarget.style.cursor = "grabbing";
    }

    if (drag.mode === "resize" && drag.noteId) {
      const deltaTicks = snapToGrid(dx / activePxPerTick, snapTicks);
      const newDuration = Math.max(snapTicks, drag.origDuration + deltaTicks);
      onResizeNote?.(drag.noteId, newDuration);
      e.currentTarget.style.cursor = "col-resize";
    }

    if (drag.mode === "erase") {
      const hit = noteAtPosition(cx, cy);
      if (hit) {
        onRemoveNote?.(hit.note.id);
      }
      e.currentTarget.style.cursor = "crosshair";
    }
  }

  function handleMouseUp(e: ReactMouseEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    stopAutoScroll();

    if (drag.mode === "draw") {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX - rect.left;

      const cursorTick = snapToGrid(
        xToTick(cx, scrollX, activePxPerTick),
        snapTicks,
      );

      // Calculate drawn range
      const startTick = Math.min(drag.drawStartTick, cursorTick);
      const endTick = Math.max(drag.drawStartTick + snapTicks, cursorTick + snapTicks);
      const duration = endTick - startTick;

      if (drag.drawPitchIndex >= 0 && drag.drawPitchIndex < pitches.length) {
        onAddNote?.({
          trackId: activeTrackId,
          pitch: pitches[drag.drawPitchIndex],
          startTick: startTick,
          durationTicks: duration,
          velocity: DEFAULT_VELOCITY,
        });
      }
    }

    dragRef.current = { ...DRAG_INITIAL };
    setDragCursor(null);
  }

  function handleMouseLeave() {
    // Only reset drag if we leave the canvas
    const drag = dragRef.current;
    if (drag.mode !== "none") {
      stopAutoScroll();
      dragRef.current = { ...DRAG_INITIAL };
      setDragCursor(null);
    }
    setHoverCell(null);
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    if (isCtrlOrMeta) {
      // Zoom horizontally
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setPxPerTick((prev) => {
        const current = prev ?? defaultPxPerTick;
        const minPx = width / (totalBars * beatsPerBar * PPQ * 2); // allow 2x zoom out
        const maxPx = 2; // max zoom in
        return Math.max(minPx, Math.min(maxPx, current * zoomFactor));
      });
    } else if (e.shiftKey) {
      // Scroll horizontally
      setScrollX((prev) =>
        Math.max(0, Math.min(contentWidth - width, prev + e.deltaY)),
      );
    } else {
      // Scroll vertically
      setScrollY((prev) =>
        Math.max(0, Math.min(contentHeight - height, prev + e.deltaY)),
      );
    }
  }

  function handleContextMenu(e: ReactMouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    // Right-click delete is handled in mouseDown + erase drag mode
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={cn("block", className)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    />
  );
}
