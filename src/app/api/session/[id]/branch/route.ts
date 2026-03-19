import { type NextRequest } from "next/server";
import {
  getSession,
  createSession,
  getTracks,
  getSections,
  addTrack,
  addSection,
} from "@/lib/session/store";

export const dynamic = "force-dynamic";

// POST /api/session/[id]/branch - create a branch (fork) of a session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine, we use defaults
  }

  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim()
      : `Branch of ${session.title}`;

  // Create branched session with same musical parameters
  const branched = createSession({
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

  // Copy tracks from the original session
  const originalTracks = getTracks(id);
  for (const track of originalTracks) {
    addTrack(branched.id, {
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

  // Copy sections from the original session
  const originalSections = getSections(id);
  for (const section of originalSections) {
    addSection(branched.id, {
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
