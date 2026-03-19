import { type NextRequest } from "next/server";
import {
  getSession as getSessionMemory,
  createSession as createSessionMemory,
  getTracks as getTracksMemory,
  getSections as getSectionsMemory,
  addTrack as addTrackMemory,
  addSection as addSectionMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getSession as getSessionDB,
  branchSession as branchSessionDB,
} from "@/lib/supabase/db";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// POST /api/session/[id]/branch - create a branch (fork) of a session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine, we use defaults
  }

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      const user = await requireAuth(client);

      const session = await getSessionDB(client, id);
      if (!session) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      const label =
        typeof body.label === "string" && body.label.trim()
          ? body.label.trim()
          : undefined;

      const branched = await branchSessionDB(client, id, user.id, label);
      if (!branched) {
        return Response.json({ error: "Failed to branch session" }, { status: 500 });
      }

      return Response.json({ session: branched }, { status: 201 });
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

  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim()
      : `Branch of ${session.title}`;

  const branched = createSessionMemory({
    userId: session.userId,
    title: label,
    description: session.description,
    status: "active",
    bpm: session.bpm,
    keySignature: session.keySignature,
    timeSignature: session.timeSignature,
    genre: session.genre,
    mood: session.mood,
    parentBranchId: session.id,
  });

  const originalTracks = getTracksMemory(id);
  for (const track of originalTracks) {
    addTrackMemory(branched.id, {
      name: track.name,
      instrument: track.instrument,
      volume: track.volume,
      pan: track.pan,
      muted: track.muted,
      solo: track.solo,
      color: track.color,
      sortOrder: track.sortOrder,
    });
  }

  const originalSections = getSectionsMemory(id);
  for (const section of originalSections) {
    addSectionMemory(branched.id, {
      name: section.name,
      type: section.type,
      startBar: section.startBar,
      lengthBars: section.lengthBars,
      chordProgression: section.chordProgression,
      sortOrder: section.sortOrder,
      color: section.color,
    });
  }

  return Response.json({ session: branched }, { status: 201 });
}
