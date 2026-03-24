// Supabase data access layer
// Mirrors every function from src/lib/session/store.ts using real Supabase queries.
// All functions accept a SupabaseClient as the first argument so routes can
// pass their own authenticated client.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Session,
  Track,
  Note,
  Section,
  ChatMessage,
  CaptureData,
  Bookmark,
} from "@/lib/music/types";
import {
  mapSessionRow,
  mapTrackRow,
  mapNoteRow,
  mapSectionRow,
  mapChatMessageRow,
  mapCaptureRow,
  mapBookmarkRow,
  sessionToRow,
  sessionUpdatesToRow,
  trackToRow,
  trackUpdatesToRow,
  noteToRow,
  sectionToRow,
  chatMessageToRow,
  captureToRow,
  bookmarkToRow,
  type SessionRow,
  type TrackRow,
  type NoteRow,
  type SectionRow,
  type ChatMessageRow,
  type CaptureRow,
  type BookmarkRow,
} from "./mappers";

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * List non-archived sessions for a user, ordered by last_active_at desc.
 */
export async function listSessions(
  client: SupabaseClient,
  userId: string,
): Promise<Session[]> {
  const { data, error } = await client
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "archived")
    .order("last_active_at", { ascending: false });

  if (error) throw error;
  return (data as SessionRow[]).map(mapSessionRow);
}

/**
 * Get a single session by id. Returns null if not found.
 */
export async function getSession(
  client: SupabaseClient,
  id: string,
): Promise<Session | null> {
  const { data, error } = await client
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSessionRow(data as SessionRow);
}

/**
 * Create a new session. Returns the created session.
 */
export async function createSession(
  client: SupabaseClient,
  userId: string,
  data: Omit<Session, "id" | "userId" | "createdAt" | "updatedAt" | "lastActiveAt">,
): Promise<Session> {
  const row = sessionToRow({ ...data, userId });

  const { data: inserted, error } = await client
    .from("sessions")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return mapSessionRow(inserted as SessionRow);
}

/**
 * Update session fields. Returns updated session or null if not found.
 */
export async function updateSession(
  client: SupabaseClient,
  id: string,
  updates: Partial<Omit<Session, "id" | "createdAt">>,
): Promise<Session | null> {
  const row = sessionUpdatesToRow(updates);

  const { data, error } = await client
    .from("sessions")
    .update(row)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSessionRow(data as SessionRow);
}

/**
 * Hard-delete a session (cascades to tracks, notes, sections, etc.).
 * Returns true if a row was deleted.
 */
export async function deleteSession(
  client: SupabaseClient,
  id: string,
): Promise<boolean> {
  const { error, count } = await client
    .from("sessions")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

/**
 * Get all tracks for a session, ordered by sort_order.
 */
export async function getTracks(
  client: SupabaseClient,
  sessionId: string,
): Promise<Track[]> {
  const { data, error } = await client
    .from("tracks")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data as TrackRow[]).map(mapTrackRow);
}

/**
 * Add a track to a session.
 */
export async function addTrack(
  client: SupabaseClient,
  sessionId: string,
  data: Omit<Track, "id" | "sessionId">,
): Promise<Track> {
  const row = trackToRow(sessionId, data);

  const { data: inserted, error } = await client
    .from("tracks")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return mapTrackRow(inserted as TrackRow);
}

/**
 * Update track fields. Returns updated track or null if not found.
 */
export async function updateTrack(
  client: SupabaseClient,
  trackId: string,
  updates: Partial<Omit<Track, "id" | "sessionId">>,
): Promise<Track | null> {
  const row = trackUpdatesToRow(updates);

  const { data, error } = await client
    .from("tracks")
    .update(row)
    .eq("id", trackId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapTrackRow(data as TrackRow);
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/**
 * Get all notes for a track.
 */
export async function getNotes(
  client: SupabaseClient,
  trackId: string,
): Promise<Note[]> {
  const { data, error } = await client
    .from("notes")
    .select("*")
    .eq("track_id", trackId)
    .order("start_tick", { ascending: true });

  if (error) throw error;
  return (data as NoteRow[]).map(mapNoteRow);
}

/**
 * Get all notes for a session (across all tracks).
 */
export async function getSessionNotes(
  client: SupabaseClient,
  sessionId: string,
): Promise<Note[]> {
  // Join through tracks to get notes belonging to this session
  const { data: tracks, error: tracksError } = await client
    .from("tracks")
    .select("id")
    .eq("session_id", sessionId);

  if (tracksError) throw tracksError;
  if (!tracks || tracks.length === 0) return [];

  const trackIds = tracks.map((t: { id: string }) => t.id);

  const { data, error } = await client
    .from("notes")
    .select("*")
    .in("track_id", trackIds)
    .order("start_tick", { ascending: true });

  if (error) throw error;
  return (data as NoteRow[]).map(mapNoteRow);
}

/**
 * Add a note to a track.
 */
export async function addNote(
  client: SupabaseClient,
  trackId: string,
  data: Omit<Note, "id" | "trackId">,
): Promise<Note> {
  const row = noteToRow(trackId, data);

  const { data: inserted, error } = await client
    .from("notes")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return mapNoteRow(inserted as NoteRow);
}

/**
 * Remove a note by id. Returns true if deleted.
 */
export async function removeNote(
  client: SupabaseClient,
  noteId: string,
): Promise<boolean> {
  const { error, count } = await client
    .from("notes")
    .delete({ count: "exact" })
    .eq("id", noteId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * Get all sections for a session, ordered by sort_order.
 */
export async function getSections(
  client: SupabaseClient,
  sessionId: string,
): Promise<Section[]> {
  const { data, error } = await client
    .from("sections")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data as SectionRow[]).map(mapSectionRow);
}

/**
 * Add a section to a session.
 */
export async function addSection(
  client: SupabaseClient,
  sessionId: string,
  data: Omit<Section, "id" | "sessionId">,
): Promise<Section> {
  const row = sectionToRow(sessionId, data);

  const { data: inserted, error } = await client
    .from("sections")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return mapSectionRow(inserted as SectionRow);
}

/**
 * Delete a section by id. Returns true if deleted.
 */
export async function deleteSection(
  client: SupabaseClient,
  sectionId: string,
): Promise<boolean> {
  const { error, count } = await client
    .from("sections")
    .delete({ count: "exact" })
    .eq("id", sectionId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

/**
 * Delete all sections for a session. Returns the number of deleted sections.
 */
export async function clearAllSections(
  client: SupabaseClient,
  sessionId: string,
): Promise<number> {
  const { error, count } = await client
    .from("sections")
    .delete({ count: "exact" })
    .eq("session_id", sessionId);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Update a section by id. Returns updated section or null if not found.
 */
export async function updateSection(
  client: SupabaseClient,
  sectionId: string,
  updates: Partial<Omit<Section, "id" | "sessionId">>,
): Promise<Section | null> {
  // Map camelCase fields to snake_case column names
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.startBar !== undefined) row.start_bar = updates.startBar;
  if (updates.lengthBars !== undefined) row.length_bars = updates.lengthBars;
  if (updates.chordProgression !== undefined) row.chord_progression = updates.chordProgression;
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
  if (updates.color !== undefined) row.color = updates.color;

  const { data, error } = await client
    .from("sections")
    .update(row)
    .eq("id", sectionId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSectionRow(data as SectionRow);
}

// ---------------------------------------------------------------------------
// Chat Messages
// ---------------------------------------------------------------------------

/**
 * Get all chat messages for a session, ordered by created_at asc.
 */
export async function getChatMessages(
  client: SupabaseClient,
  sessionId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await client
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as ChatMessageRow[]).map(mapChatMessageRow);
}

/**
 * Add a chat message to a session.
 */
export async function addChatMessage(
  client: SupabaseClient,
  sessionId: string,
  data: Omit<ChatMessage, "id" | "sessionId" | "createdAt">,
): Promise<ChatMessage> {
  const row = chatMessageToRow(sessionId, data);

  const { data: inserted, error } = await client
    .from("chat_messages")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return mapChatMessageRow(inserted as ChatMessageRow);
}

// ---------------------------------------------------------------------------
// Captures
// ---------------------------------------------------------------------------

/**
 * Get all captures for a session, ordered by created_at desc.
 */
export async function getCaptures(
  client: SupabaseClient,
  sessionId: string,
): Promise<CaptureData[]> {
  const { data, error } = await client
    .from("captures")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as CaptureRow[]).map(mapCaptureRow);
}

/**
 * Add a capture to a session.
 */
export async function addCapture(
  client: SupabaseClient,
  sessionId: string,
  data: Omit<CaptureData, "id" | "sessionId" | "createdAt">,
): Promise<CaptureData> {
  const row = captureToRow(sessionId, data);

  const { data: inserted, error } = await client
    .from("captures")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return mapCaptureRow(inserted as CaptureRow);
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

/**
 * Get all bookmarks for a session, ordered by created_at desc.
 */
export async function getBookmarks(
  client: SupabaseClient,
  sessionId: string,
): Promise<Bookmark[]> {
  const { data, error } = await client
    .from("bookmarks")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as BookmarkRow[]).map(mapBookmarkRow);
}

/**
 * Add a bookmark to a session.
 */
export async function addBookmark(
  client: SupabaseClient,
  sessionId: string,
  data: Omit<Bookmark, "id" | "sessionId" | "createdAt">,
): Promise<Bookmark> {
  const row = bookmarkToRow(sessionId, data);

  const { data: inserted, error } = await client
    .from("bookmarks")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return mapBookmarkRow(inserted as BookmarkRow);
}

// ---------------------------------------------------------------------------
// Branch Session
// ---------------------------------------------------------------------------

/**
 * Create a branch (fork) of an existing session.
 * Copies the session metadata, all tracks, notes, and sections.
 * Returns the new session or null if the source session doesn't exist.
 */
export async function branchSession(
  client: SupabaseClient,
  sessionId: string,
  userId: string,
  label?: string,
): Promise<Session | null> {
  // 1. Load original session
  const original = await getSession(client, sessionId);
  if (!original) return null;

  // 2. Create the branched session
  const branchTitle = label ?? `${original.title} (branch)`;
  const newSession = await createSession(client, userId, {
    title: branchTitle,
    description: original.description,
    status: "active",
    bpm: original.bpm,
    keySignature: original.keySignature,
    timeSignature: original.timeSignature,
    genre: original.genre,
    mood: original.mood,
    parentBranchId: original.id,
  });

  // 3. Copy tracks and their notes
  const originalTracks = await getTracks(client, sessionId);
  for (const track of originalTracks) {
    const newTrack = await addTrack(client, newSession.id, {
      name: track.name,
      instrument: track.instrument,
      volume: track.volume,
      pan: track.pan,
      muted: track.muted,
      solo: track.solo,
      color: track.color,
      sortOrder: track.sortOrder,
    });

    const trackNotes = await getNotes(client, track.id);
    for (const note of trackNotes) {
      await addNote(client, newTrack.id, {
        sectionId: undefined, // Section IDs won't match; notes are unlinked in branch
        pitch: note.pitch,
        startTick: note.startTick,
        durationTicks: note.durationTicks,
        velocity: note.velocity,
      });
    }
  }

  // 4. Copy sections
  const originalSections = await getSections(client, sessionId);
  for (const section of originalSections) {
    await addSection(client, newSession.id, {
      name: section.name,
      type: section.type,
      startBar: section.startBar,
      lengthBars: section.lengthBars,
      chordProgression: section.chordProgression,
      sortOrder: section.sortOrder,
      color: section.color,
    });
  }

  return newSession;
}
