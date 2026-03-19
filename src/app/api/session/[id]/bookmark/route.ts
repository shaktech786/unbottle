import { type NextRequest } from "next/server";
import { getSession, getBookmarks, addBookmark } from "@/lib/session/store";
import type { Bookmark } from "@/lib/music/types";

export const dynamic = "force-dynamic";

// GET /api/session/[id]/bookmark - list bookmarks for a session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const bookmarks = getBookmarks(id);
  return Response.json({ bookmarks });
}

// POST /api/session/[id]/bookmark - create a bookmark
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.label !== "string" || !body.label.trim()) {
    return Response.json(
      { error: "label is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  const contextSnapshot = (body.contextSnapshot ?? {}) as Bookmark["contextSnapshot"];

  const bookmark = addBookmark(id, {
    label: body.label.trim(),
    description: typeof body.description === "string" ? body.description : undefined,
    contextSnapshot,
  });

  return Response.json({ bookmark }, { status: 201 });
}
