import { type NextRequest } from "next/server";
import {
  getSession as getSessionMemory,
  getBookmarks as getBookmarksMemory,
  addBookmark as addBookmarkMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getSession as getSessionDB,
  getBookmarks as getBookmarksDB,
  addBookmark as addBookmarkDB,
} from "@/lib/supabase/db";
import type { Bookmark } from "@/lib/music/types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// GET /api/session/[id]/bookmark - list bookmarks for a session
export async function GET(
  _request: NextRequest,
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

      const bookmarks = await getBookmarksDB(client, id);
      return Response.json({ bookmarks });
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
  const bookmarks = getBookmarksMemory(id);
  return Response.json({ bookmarks });
}

// POST /api/session/[id]/bookmark - create a bookmark
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
  const bookmarkData = {
    label: body.label.trim(),
    description: typeof body.description === "string" ? body.description : undefined,
    contextSnapshot,
  };

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);

      const session = await getSessionDB(client, id);
      if (!session) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      const bookmark = await addBookmarkDB(client, id, bookmarkData);
      return Response.json({ bookmark }, { status: 201 });
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
  const bookmark = addBookmarkMemory(id, bookmarkData);
  return Response.json({ bookmark }, { status: 201 });
}
