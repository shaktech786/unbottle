// Maps between snake_case DB rows and camelCase TypeScript types
// Each mapper is a pure function with explicit field mapping (no generic transforms)

import type {
  Session,
  Track,
  Note,
  Section,
  SectionType,
  InstrumentType,
  ChatMessage,
  CaptureData,
  Bookmark,
  ChordEvent,
  Pitch,
} from "@/lib/music/types";

// ---------------------------------------------------------------------------
// DB row types (what Supabase returns)
// ---------------------------------------------------------------------------

export interface SessionRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  bpm: number;
  key_signature: string;
  time_signature: string;
  genre: string | null;
  mood: string | null;
  parent_branch_id: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface TrackRow {
  id: string;
  session_id: string;
  name: string;
  instrument: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: string;
  track_id: string;
  section_id: string | null;
  pitch: string;
  start_tick: number;
  duration_ticks: number;
  velocity: number;
  created_at: string;
}

export interface SectionRow {
  id: string;
  session_id: string;
  name: string;
  type: string;
  start_bar: number;
  length_bars: number;
  chord_progression: ChordEvent[] | string;
  sort_order: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CaptureRow {
  id: string;
  session_id: string;
  type: string;
  audio_url: string | null;
  transcription: string | null;
  detected_notes: { pitch: string; start: number; duration: number }[] | null;
  detected_rhythm: { time: number; velocity: number }[] | null;
  text_description: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface BookmarkRow {
  id: string;
  session_id: string;
  label: string;
  description: string | null;
  context_snapshot: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Row -> TypeScript mappers
// ---------------------------------------------------------------------------

export function mapSessionRow(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as Session["status"],
    bpm: row.bpm,
    keySignature: row.key_signature,
    timeSignature: row.time_signature,
    genre: row.genre ?? undefined,
    mood: row.mood ?? undefined,
    parentBranchId: row.parent_branch_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActiveAt: row.last_active_at,
  };
}

export function mapTrackRow(row: TrackRow): Track {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    instrument: row.instrument as InstrumentType,
    volume: row.volume,
    pan: row.pan,
    muted: row.muted,
    solo: row.solo,
    color: row.color,
    sortOrder: row.sort_order,
  };
}

export function mapNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    trackId: row.track_id,
    sectionId: row.section_id ?? undefined,
    pitch: row.pitch as Pitch,
    startTick: row.start_tick,
    durationTicks: row.duration_ticks,
    velocity: row.velocity,
  };
}

export function mapSectionRow(row: SectionRow): Section {
  const chordProgression =
    typeof row.chord_progression === "string"
      ? (JSON.parse(row.chord_progression) as ChordEvent[])
      : (row.chord_progression ?? []);

  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    type: row.type as SectionType,
    startBar: row.start_bar,
    lengthBars: row.length_bars,
    chordProgression,
    sortOrder: row.sort_order,
    color: row.color,
  };
}

export function mapChatMessageRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role as ChatMessage["role"],
    content: row.content,
    metadata: row.metadata
      ? (row.metadata as ChatMessage["metadata"])
      : undefined,
    createdAt: row.created_at,
  };
}

export function mapCaptureRow(row: CaptureRow): CaptureData {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type as CaptureData["type"],
    audioUrl: row.audio_url ?? undefined,
    transcription: row.transcription ?? undefined,
    detectedNotes: row.detected_notes
      ? row.detected_notes.map((n) => ({
          pitch: n.pitch as Pitch,
          start: n.start,
          duration: n.duration,
        }))
      : undefined,
    detectedRhythm: row.detected_rhythm ?? undefined,
    textDescription: row.text_description ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapBookmarkRow(row: BookmarkRow): Bookmark {
  const snapshot = row.context_snapshot as Bookmark["contextSnapshot"];
  return {
    id: row.id,
    sessionId: row.session_id,
    label: row.label,
    description: row.description ?? undefined,
    contextSnapshot: {
      currentSection: snapshot.currentSection,
      chatSummary: snapshot.chatSummary,
      lastAction: snapshot.lastAction,
      activeTrackId: snapshot.activeTrackId,
      playheadPosition: snapshot.playheadPosition,
    },
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// TypeScript -> Row mappers (for inserts/updates)
// ---------------------------------------------------------------------------

type SessionInsertFields = Omit<Session, "id" | "createdAt" | "updatedAt" | "lastActiveAt">;

export function sessionToRow(
  data: SessionInsertFields,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: data.userId,
    title: data.title,
    status: data.status,
    bpm: data.bpm,
    key_signature: data.keySignature,
    time_signature: data.timeSignature,
  };
  if (data.description !== undefined) row.description = data.description;
  if (data.genre !== undefined) row.genre = data.genre;
  if (data.mood !== undefined) row.mood = data.mood;
  if (data.parentBranchId !== undefined)
    row.parent_branch_id = data.parentBranchId;
  return row;
}

export function sessionUpdatesToRow(
  updates: Partial<Omit<Session, "id" | "createdAt">>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.bpm !== undefined) row.bpm = updates.bpm;
  if (updates.keySignature !== undefined)
    row.key_signature = updates.keySignature;
  if (updates.timeSignature !== undefined)
    row.time_signature = updates.timeSignature;
  if (updates.genre !== undefined) row.genre = updates.genre;
  if (updates.mood !== undefined) row.mood = updates.mood;
  if (updates.parentBranchId !== undefined)
    row.parent_branch_id = updates.parentBranchId;
  // updated_at and last_active_at are handled by DB triggers / explicit set
  row.last_active_at = new Date().toISOString();
  return row;
}

type TrackInsertFields = Omit<Track, "id" | "sessionId">;

export function trackToRow(
  sessionId: string,
  data: TrackInsertFields,
): Record<string, unknown> {
  return {
    session_id: sessionId,
    name: data.name,
    instrument: data.instrument,
    volume: data.volume,
    pan: data.pan,
    muted: data.muted,
    solo: data.solo,
    color: data.color,
    sort_order: data.sortOrder,
  };
}

export function trackUpdatesToRow(
  updates: Partial<Omit<Track, "id" | "sessionId">>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.instrument !== undefined) row.instrument = updates.instrument;
  if (updates.volume !== undefined) row.volume = updates.volume;
  if (updates.pan !== undefined) row.pan = updates.pan;
  if (updates.muted !== undefined) row.muted = updates.muted;
  if (updates.solo !== undefined) row.solo = updates.solo;
  if (updates.color !== undefined) row.color = updates.color;
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
  return row;
}

type NoteInsertFields = Omit<Note, "id" | "trackId">;

export function noteToRow(
  trackId: string,
  data: NoteInsertFields,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    track_id: trackId,
    pitch: data.pitch,
    start_tick: data.startTick,
    duration_ticks: data.durationTicks,
    velocity: data.velocity,
  };
  if (data.sectionId !== undefined) row.section_id = data.sectionId;
  return row;
}

type SectionInsertFields = Omit<Section, "id" | "sessionId">;

export function sectionToRow(
  sessionId: string,
  data: SectionInsertFields,
): Record<string, unknown> {
  return {
    session_id: sessionId,
    name: data.name,
    type: data.type,
    start_bar: data.startBar,
    length_bars: data.lengthBars,
    chord_progression: data.chordProgression,
    sort_order: data.sortOrder,
    color: data.color,
  };
}

type ChatMessageInsertFields = Omit<ChatMessage, "id" | "sessionId" | "createdAt">;

export function chatMessageToRow(
  sessionId: string,
  data: ChatMessageInsertFields,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    session_id: sessionId,
    role: data.role,
    content: data.content,
  };
  if (data.metadata !== undefined) row.metadata = data.metadata;
  return row;
}

type CaptureInsertFields = Omit<CaptureData, "id" | "sessionId" | "createdAt">;

export function captureToRow(
  sessionId: string,
  data: CaptureInsertFields,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    session_id: sessionId,
    type: data.type,
  };
  if (data.audioUrl !== undefined) row.audio_url = data.audioUrl;
  if (data.transcription !== undefined) row.transcription = data.transcription;
  if (data.detectedNotes !== undefined)
    row.detected_notes = data.detectedNotes;
  if (data.detectedRhythm !== undefined)
    row.detected_rhythm = data.detectedRhythm;
  if (data.textDescription !== undefined)
    row.text_description = data.textDescription;
  if (data.durationMs !== undefined) row.duration_ms = data.durationMs;
  return row;
}

type BookmarkInsertFields = Omit<Bookmark, "id" | "sessionId" | "createdAt">;

export function bookmarkToRow(
  sessionId: string,
  data: BookmarkInsertFields,
): Record<string, unknown> {
  return {
    session_id: sessionId,
    label: data.label,
    description: data.description ?? null,
    context_snapshot: data.contextSnapshot,
  };
}
