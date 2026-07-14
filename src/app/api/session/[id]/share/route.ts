import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getSession as getSessionDB,
  updateSession as updateSessionDB,
} from "@/lib/supabase/db";
import {
  getSession as getSessionMemory,
  updateSession as updateSessionMemory,
} from "@/lib/session/store";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// POST /api/session/[id]/share - toggle is_shared on a session
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      const user = await requireAuth(client);

      const session = await getSessionDB(client, id);
      if (!session) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      if (session.userId !== user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const nowShared = !session.isShared;
      const updates = nowShared
        ? { isShared: true, sharedAt: new Date().toISOString() }
        : { isShared: false, sharedAt: undefined };

      const updated = await updateSessionDB(client, id, updates);
      if (!updated) {
        return Response.json({ error: "Failed to update session" }, { status: 500 });
      }

      const shareUrl = nowShared
        ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/share/${id}`
        : null;

      return Response.json({ shareUrl, isShared: nowShared });
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

  const nowShared = !session.isShared;
  const updates = nowShared
    ? { isShared: true, sharedAt: new Date().toISOString() }
    : { isShared: false, sharedAt: undefined };

  const updated = updateSessionMemory(id, updates);
  if (!updated) {
    return Response.json({ error: "Failed to update session" }, { status: 500 });
  }

  const shareUrl = nowShared
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/share/${id}`
    : null;

  return Response.json({ shareUrl, isShared: nowShared });
}
