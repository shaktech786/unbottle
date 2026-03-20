// Temporary in-memory store until Supabase is wired
// Stores sessions, tracks, notes, sections, messages

import type {
  Session,
  Track,
  Note,
  Section,
  ChatMessage,
  CaptureData,
  Bookmark,
} from "@/lib/music/types";

// --- Maps ---

const sessions = new Map<string, Session>();
const tracksBySession = new Map<string, Track[]>();
const notesByTrack = new Map<string, Note[]>();
const sectionsBySession = new Map<string, Section[]>();
const chatMessagesBySession = new Map<string, ChatMessage[]>();
const capturesBySession = new Map<string, CaptureData[]>();
const bookmarksBySession = new Map<string, Bookmark[]>();

// --- ID generator ---

let counter = 0;
export function generateId(): string {
  counter += 1;
  return `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Session helpers ---

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function createSession(
  data: Omit<Session, "id" | "createdAt" | "updatedAt" | "lastActiveAt">,
): Session {
  const now = new Date().toISOString();
  const session: Session = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
  };
  sessions.set(session.id, session);
  tracksBySession.set(session.id, []);
  sectionsBySession.set(session.id, []);
  chatMessagesBySession.set(session.id, []);
  bookmarksBySession.set(session.id, []);
  return session;
}

export function updateSession(
  id: string,
  updates: Partial<Omit<Session, "id" | "createdAt">>,
): Session | undefined {
  const existing = sessions.get(id);
  if (!existing) return undefined;

  const updated: Session = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
  sessions.set(id, updated);
  return updated;
}

export function listSessions(userId?: string): Session[] {
  const all = Array.from(sessions.values()).filter(
    (s) => s.status !== "archived",
  );
  const filtered = userId ? all.filter((s) => s.userId === userId) : all;
  return filtered.sort(
    (a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
  );
}

// --- Track helpers ---

export function addTrack(
  sessionId: string,
  data: Omit<Track, "id" | "sessionId">,
): Track {
  const track: Track = {
    ...data,
    id: generateId(),
    sessionId,
  };
  const tracks = tracksBySession.get(sessionId) ?? [];
  tracks.push(track);
  tracksBySession.set(sessionId, tracks);
  return track;
}

export function updateTrack(
  trackId: string,
  sessionId: string,
  updates: Record<string, unknown>,
): Track | undefined {
  const sessionTracks = tracksBySession.get(sessionId);
  if (!sessionTracks) return undefined;
  const idx = sessionTracks.findIndex((t) => t.id === trackId);
  if (idx === -1) return undefined;
  sessionTracks[idx] = { ...sessionTracks[idx], ...updates } as Track;
  return sessionTracks[idx];
}

export function getTracks(sessionId: string): Track[] {
  return tracksBySession.get(sessionId) ?? [];
}

// --- Note helpers ---

export function addNote(
  trackId: string,
  data: Omit<Note, "id" | "trackId">,
): Note {
  const note: Note = {
    ...data,
    id: generateId(),
    trackId,
  };
  const notes = notesByTrack.get(trackId) ?? [];
  notes.push(note);
  notesByTrack.set(trackId, notes);
  return note;
}

export function getNotes(trackId: string): Note[] {
  return notesByTrack.get(trackId) ?? [];
}

export function getSessionNotes(sessionId: string): Note[] {
  const tracks = getTracks(sessionId);
  const allNotes: Note[] = [];
  for (const track of tracks) {
    allNotes.push(...getNotes(track.id));
  }
  return allNotes.sort((a, b) => a.startTick - b.startTick);
}

export function removeNote(trackId: string, noteId: string): boolean {
  const notes = notesByTrack.get(trackId);
  if (!notes) return false;
  const idx = notes.findIndex((n) => n.id === noteId);
  if (idx === -1) return false;
  notes.splice(idx, 1);
  return true;
}

/**
 * Replace all notes for a session with the provided array.
 * Clears existing notes for all tracks in the session, then inserts the new ones.
 */
export function syncSessionNotes(sessionId: string, notes: Note[]): Note[] {
  const tracks = getTracks(sessionId);
  // Clear all existing notes for this session's tracks
  for (const track of tracks) {
    notesByTrack.set(track.id, []);
  }
  // Insert new notes grouped by trackId
  for (const note of notes) {
    const trackNotes = notesByTrack.get(note.trackId) ?? [];
    trackNotes.push(note);
    notesByTrack.set(note.trackId, trackNotes);
  }
  return notes;
}

// --- Section helpers ---

export function addSection(
  sessionId: string,
  data: Omit<Section, "id" | "sessionId">,
): Section {
  const section: Section = {
    ...data,
    id: generateId(),
    sessionId,
  };
  const sections = sectionsBySession.get(sessionId) ?? [];
  sections.push(section);
  sectionsBySession.set(sessionId, sections);
  return section;
}

export function getSections(sessionId: string): Section[] {
  return (sectionsBySession.get(sessionId) ?? []).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function deleteSection(sessionId: string, sectionId: string): boolean {
  const sections = sectionsBySession.get(sessionId);
  if (!sections) return false;
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) return false;
  sections.splice(idx, 1);
  return true;
}

export function updateSection(
  sessionId: string,
  sectionId: string,
  updates: Partial<Omit<Section, "id" | "sessionId">>,
): Section | undefined {
  const sections = sectionsBySession.get(sessionId);
  if (!sections) return undefined;
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) return undefined;
  sections[idx] = { ...sections[idx], ...updates };
  return sections[idx];
}

// --- ChatMessage helpers ---

export function addChatMessage(
  sessionId: string,
  data: Omit<ChatMessage, "id" | "sessionId" | "createdAt">,
): ChatMessage {
  const message: ChatMessage = {
    ...data,
    id: generateId(),
    sessionId,
    createdAt: new Date().toISOString(),
  };
  const messages = chatMessagesBySession.get(sessionId) ?? [];
  messages.push(message);
  chatMessagesBySession.set(sessionId, messages);
  return message;
}

export function getChatMessages(sessionId: string): ChatMessage[] {
  return (chatMessagesBySession.get(sessionId) ?? []).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

// --- Capture helpers ---

export function addCapture(
  sessionId: string,
  data: Omit<CaptureData, "id" | "sessionId" | "createdAt">,
): CaptureData {
  const capture: CaptureData = {
    ...data,
    id: generateId(),
    sessionId,
    createdAt: new Date().toISOString(),
  };
  const captures = capturesBySession.get(sessionId) ?? [];
  captures.push(capture);
  capturesBySession.set(sessionId, captures);
  return capture;
}

export function getCaptures(sessionId: string): CaptureData[] {
  return (capturesBySession.get(sessionId) ?? []).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

// --- Bookmark helpers ---

export function addBookmark(
  sessionId: string,
  data: Omit<Bookmark, "id" | "sessionId" | "createdAt">,
): Bookmark {
  const bookmark: Bookmark = {
    ...data,
    id: generateId(),
    sessionId,
    createdAt: new Date().toISOString(),
  };
  const bookmarks = bookmarksBySession.get(sessionId) ?? [];
  bookmarks.push(bookmark);
  bookmarksBySession.set(sessionId, bookmarks);
  return bookmark;
}

export function getBookmarks(sessionId: string): Bookmark[] {
  return bookmarksBySession.get(sessionId) ?? [];
}

// Export maps for direct access from API routes if needed
export { sessions, tracksBySession, sectionsBySession };
