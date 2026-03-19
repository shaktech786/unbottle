import {
  getSession as getSessionMemory,
  updateSession as updateSessionMemory,
  getTracks as getTracksMemory,
  getSections as getSectionsMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getSession as getSessionDB,
  updateSession as updateSessionDB,
  // deleteSession as deleteSessionDB, // soft delete via updateSession
  getTracks as getTracksDB,
  getSections as getSectionsDB,
} from "@/lib/supabase/db";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// GET /api/session/[id] - get a single session with tracks and sections
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);

      const session = await getSessionDB(client, id);
      if (!session) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      const [tracks, sections] = await Promise.all([
        getTracksDB(client, id),
        getSectionsDB(client, id),
      ]);

      return Response.json({ session, tracks, sections });
    } catch (err) {
      if (err instanceof Error && err.message === "Authentication required") {
        return Response.json({ error: "Authentication required" }, { status: 401 });
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // Fallback: in-memory store
  const session = getSessionMemory(id);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }
  const tracks = getTracksMemory(id);
  const sections = getSectionsMemory(id);
  return Response.json({ session, tracks, sections });
}

// PUT /api/session/[id] - update session metadata
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowedFields = [
    "title",
    "description",
    "status",
    "bpm",
    "keySignature",
    "timeSignature",
    "genre",
    "mood",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);

      const updated = await updateSessionDB(client, id, updates);
      if (!updated) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      return Response.json({ session: updated });
    } catch (err) {
      if (err instanceof Error && err.message === "Authentication required") {
        return Response.json({ error: "Authentication required" }, { status: 401 });
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // Fallback: in-memory store
  const session = getSessionMemory(id);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }
  const updated = updateSessionMemory(id, updates);
  if (!updated) {
    return Response.json({ error: "Failed to update session" }, { status: 500 });
  }
  return Response.json({ session: updated });
}

// DELETE /api/session/[id] - archive (soft delete) or hard delete
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);

      // Soft delete: archive the session (matches existing behavior)
      const updated = await updateSessionDB(client, id, { status: "archived" });
      if (!updated) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      return Response.json({ session: updated });
    } catch (err) {
      if (err instanceof Error && err.message === "Authentication required") {
        return Response.json({ error: "Authentication required" }, { status: 401 });
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // Fallback: in-memory store
  const session = getSessionMemory(id);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }
  const updated = updateSessionMemory(id, { status: "archived" });
  if (!updated) {
    return Response.json({ error: "Failed to archive session" }, { status: 500 });
  }
  return Response.json({ session: updated });
}
