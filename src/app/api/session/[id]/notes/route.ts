import {
  getSession as getSessionMemory,
  getTracks as getTracksMemory,
  syncSessionNotes as syncSessionNotesMemory,
  getSessionNotes as getSessionNotesMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getSession as getSessionDB,
  getTracks as getTracksDB,
  getSessionNotes as getSessionNotesDB,
  addNote as addNoteDB,
  removeNote as removeNoteDB,
} from "@/lib/supabase/db";
import type { Note, Pitch } from "@/lib/music/types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

interface NotePayload {
  id: string;
  trackId: string;
  sectionId?: string;
  pitch: Pitch;
  startTick: number;
  durationTicks: number;
  velocity: number;
}

// POST /api/session/[id]/notes - bulk sync notes for a session
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { notes: NotePayload[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.notes)) {
    return Response.json(
      { error: "Body must contain a `notes` array" },
      { status: 400 },
    );
  }

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);

      const session = await getSessionDB(client, id);
      if (!session) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      // Get existing notes for diff
      const tracks = await getTracksDB(client, id);
      const trackIds = new Set(tracks.map((t) => t.id));
      const existingNotes = await getSessionNotesDB(client, id);
      const existingIds = new Set(existingNotes.map((n) => n.id));
      const incomingIds = new Set(body.notes.map((n) => n.id));

      // Delete notes that are no longer present
      const toDelete = existingNotes.filter((n) => !incomingIds.has(n.id));
      for (const note of toDelete) {
        await removeNoteDB(client, note.id);
      }

      // Add notes that don't exist yet (only for valid tracks)
      const toAdd = body.notes.filter(
        (n) => !existingIds.has(n.id) && trackIds.has(n.trackId),
      );
      for (const note of toAdd) {
        await addNoteDB(client, note.trackId, {
          pitch: note.pitch,
          startTick: note.startTick,
          durationTicks: note.durationTicks,
          velocity: note.velocity,
          sectionId: note.sectionId,
        });
      }

      // For notes that exist in both, we could update them, but for simplicity
      // we delete and re-add if they changed. Check by comparing key fields.
      const existingMap = new Map(existingNotes.map((n) => [n.id, n]));
      const toUpdate = body.notes.filter((n) => {
        if (!existingIds.has(n.id)) return false;
        const existing = existingMap.get(n.id);
        if (!existing) return false;
        return (
          existing.pitch !== n.pitch ||
          existing.startTick !== n.startTick ||
          existing.durationTicks !== n.durationTicks ||
          existing.velocity !== n.velocity ||
          existing.trackId !== n.trackId
        );
      });
      for (const note of toUpdate) {
        await removeNoteDB(client, note.id);
        await addNoteDB(client, note.trackId, {
          pitch: note.pitch,
          startTick: note.startTick,
          durationTicks: note.durationTicks,
          velocity: note.velocity,
          sectionId: note.sectionId,
        });
      }

      // Return the fresh set
      const freshNotes = await getSessionNotesDB(client, id);
      return Response.json({ notes: freshNotes });
    } catch (err) {
      if (err instanceof Error && err.message === "Authentication required") {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // Fallback: in-memory store
  const session = getSessionMemory(id);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Validate that trackIds belong to this session
  const tracks = getTracksMemory(id);
  const trackIds = new Set(tracks.map((t) => t.id));
  const validNotes: Note[] = body.notes
    .filter((n) => trackIds.has(n.trackId))
    .map((n) => ({
      id: n.id,
      trackId: n.trackId,
      sectionId: n.sectionId,
      pitch: n.pitch,
      startTick: n.startTick,
      durationTicks: n.durationTicks,
      velocity: n.velocity,
    }));

  syncSessionNotesMemory(id, validNotes);
  const notes = getSessionNotesMemory(id);
  return Response.json({ notes });
}
