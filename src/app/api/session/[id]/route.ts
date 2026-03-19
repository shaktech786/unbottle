import {
  getSession,
  updateSession,
  getTracks,
  getSections,
} from "@/lib/session/store";

export const dynamic = "force-dynamic";

// GET /api/session/[id] - get a single session with tracks and sections
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const tracks = getTracks(id);
  const sections = getSections(id);

  return Response.json({ session, tracks, sections });
}

// PUT /api/session/[id] - update session metadata
export async function PUT(
  request: Request,
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

  const updated = updateSession(id, updates);

  if (!updated) {
    return Response.json({ error: "Failed to update session" }, { status: 500 });
  }

  return Response.json({ session: updated });
}

// DELETE /api/session/[id] - soft delete (archive)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const updated = updateSession(id, { status: "archived" });

  if (!updated) {
    return Response.json(
      { error: "Failed to archive session" },
      { status: 500 },
    );
  }

  return Response.json({ session: updated });
}
