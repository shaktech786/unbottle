/**
 * DAW state — an in-process, mutation-safe store for tracks, clips,
 * playback state, and undo/redo history. This is the single source
 * of truth that executeDAWTool mutates.
 *
 * Designed to be created once per user session; the executor receives
 * a reference to the shared instance.
 */

import { UndoStack } from "@/lib/project/undo-stack";
import type { Track, InstrumentType } from "@/lib/music/types";

// ---------------------------------------------------------------------------
// Clip — lightweight timeline clip tracked by the DAW layer
// ---------------------------------------------------------------------------

export interface DAWClip {
  id: string;
  trackId: string;
  name: string;
  startBar: number;
  lengthBars: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Playback state
// ---------------------------------------------------------------------------

export type PlaybackStatus = "stopped" | "playing" | "paused";

export interface PlaybackState {
  status: PlaybackStatus;
  /** Current playhead position in bars (1-indexed) */
  currentBar: number;
}

// ---------------------------------------------------------------------------
// DAW state snapshot (used by undo/redo)
// ---------------------------------------------------------------------------

export interface DAWStateSnapshot {
  tracks: Track[];
  clips: DAWClip[];
  bpm: number;
  keySignature: string;
}

// ---------------------------------------------------------------------------
// DAWState class
// ---------------------------------------------------------------------------

let _idCounter = 0;
function nextId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}-${Date.now()}-${_idCounter}`;
}

const TRACK_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
];

export class DAWState {
  private _tracks: Track[] = [];
  private _clips: DAWClip[] = [];
  private _bpm: number = 120;
  private _keySignature: string = "C major";
  private _playback: PlaybackState = { status: "stopped", currentBar: 1 };
  private _undo = new UndoStack();

  // ── Getters ──────────────────────────────────────────────────────────────

  get tracks(): readonly Track[] {
    return this._tracks;
  }

  get clips(): readonly DAWClip[] {
    return this._clips;
  }

  get bpm(): number {
    return this._bpm;
  }

  get keySignature(): string {
    return this._keySignature;
  }

  get playback(): Readonly<PlaybackState> {
    return this._playback;
  }

  get isInitialized(): boolean {
    return true;
  }

  // ── Snapshot helpers ─────────────────────────────────────────────────────

  snapshot(): DAWStateSnapshot {
    return {
      tracks: structuredClone(this._tracks),
      clips: structuredClone(this._clips),
      bpm: this._bpm,
      keySignature: this._keySignature,
    };
  }

  private _pushUndo(): void {
    this._undo.push({
      tracks: this._tracks,
      sections: [],
      notes: [],
      bpm: this._bpm,
      keySignature: this._keySignature,
    });
  }

  private _restoreFromUndoSnapshot(s: { tracks: Track[]; bpm: number; keySignature: string } | null): void {
    if (!s) return;
    this._tracks = s.tracks;
    this._bpm = s.bpm;
    this._keySignature = s.keySignature;
  }

  // ── Track operations ─────────────────────────────────────────────────────

  createTrack(params: {
    name: string;
    instrument?: InstrumentType;
    volume?: number;
    color?: string;
  }): Track {
    this._pushUndo();
    const track: Track = {
      id: nextId("track"),
      sessionId: "daw",
      name: params.name,
      instrument: params.instrument ?? "synth",
      volume: Math.max(0, Math.min(1, params.volume ?? 0.8)),
      pan: 0,
      muted: false,
      solo: false,
      color: params.color ?? TRACK_COLORS[this._tracks.length % TRACK_COLORS.length],
      sortOrder: this._tracks.length,
    };
    this._tracks = [...this._tracks, track];
    return track;
  }

  deleteTrack(trackId: string): boolean {
    const idx = this._tracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return false;
    this._pushUndo();
    this._tracks = this._tracks.filter((t) => t.id !== trackId);
    this._clips = this._clips.filter((c) => c.trackId !== trackId);
    return true;
  }

  setVolume(trackId: string, volume: number): Track | null {
    const idx = this._tracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return null;
    this._pushUndo();
    const clamped = Math.max(0, Math.min(1, volume));
    this._tracks = this._tracks.map((t) =>
      t.id === trackId ? { ...t, volume: clamped } : t,
    );
    return this._tracks.find((t) => t.id === trackId) ?? null;
  }

  muteTrack(trackId: string, muted?: boolean): Track | null {
    const idx = this._tracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return null;
    this._pushUndo();
    const current = this._tracks[idx];
    const newMuted = muted !== undefined ? muted : !current.muted;
    this._tracks = this._tracks.map((t) =>
      t.id === trackId ? { ...t, muted: newMuted } : t,
    );
    return this._tracks.find((t) => t.id === trackId) ?? null;
  }

  soloTrack(trackId: string, solo?: boolean): Track | null {
    const idx = this._tracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return null;
    this._pushUndo();
    const current = this._tracks[idx];
    const newSolo = solo !== undefined ? solo : !current.solo;
    this._tracks = this._tracks.map((t) =>
      t.id === trackId ? { ...t, solo: newSolo } : t,
    );
    return this._tracks.find((t) => t.id === trackId) ?? null;
  }

  // ── Clip operations ───────────────────────────────────────────────────────

  addClip(params: {
    trackId: string;
    name?: string;
    startBar: number;
    lengthBars: number;
    color?: string;
  }): DAWClip | null {
    const track = this._tracks.find((t) => t.id === params.trackId);
    if (!track) return null;
    this._pushUndo();
    const clip: DAWClip = {
      id: nextId("clip"),
      trackId: params.trackId,
      name: params.name ?? `Clip`,
      startBar: Math.max(1, params.startBar),
      lengthBars: Math.max(1, params.lengthBars),
      color: params.color ?? track.color,
    };
    this._clips = [...this._clips, clip];
    return clip;
  }

  // ── Tempo / key ───────────────────────────────────────────────────────────

  setTempo(bpm: number): number {
    this._pushUndo();
    this._bpm = Math.max(20, Math.min(400, bpm));
    return this._bpm;
  }

  // ── Playback ───────────────────────────────────────────────────────────────

  play(fromBar?: number): PlaybackState {
    if (fromBar !== undefined) {
      this._playback = { status: "playing", currentBar: Math.max(1, fromBar) };
    } else {
      this._playback = { ...this._playback, status: "playing" };
    }
    return this._playback;
  }

  pause(): PlaybackState {
    this._playback = { ...this._playback, status: "paused" };
    return this._playback;
  }

  stopPlayback(): PlaybackState {
    this._playback = { status: "stopped", currentBar: 1 };
    return this._playback;
  }

  // ── Undo / redo ───────────────────────────────────────────────────────────

  undo(): boolean {
    const prev = this._undo.undo({
      tracks: this._tracks,
      sections: [],
      notes: [],
      bpm: this._bpm,
      keySignature: this._keySignature,
    });
    if (!prev) return false;
    this._restoreFromUndoSnapshot(prev);
    return true;
  }

  redo(): boolean {
    const next = this._undo.redo({
      tracks: this._tracks,
      sections: [],
      notes: [],
      bpm: this._bpm,
      keySignature: this._keySignature,
    });
    if (!next) return false;
    this._restoreFromUndoSnapshot(next);
    return true;
  }

  canUndo(): boolean {
    return this._undo.canUndo();
  }

  canRedo(): boolean {
    return this._undo.canRedo();
  }
}

// ---------------------------------------------------------------------------
// Singleton used by the API layer — tests create fresh instances
// ---------------------------------------------------------------------------

let _singleton: DAWState | null = null;

export function getDAWState(): DAWState {
  if (!_singleton) {
    _singleton = new DAWState();
  }
  return _singleton;
}

/** Reset the singleton (for tests). */
export function resetDAWState(): void {
  _singleton = null;
}
