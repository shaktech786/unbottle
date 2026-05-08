import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getSession as getSessionDB, updateSession as updateSessionDB } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

const BASE_URL = "https://unbottle-rouge.vercel.app";

// POST /api/sessions/[id]/share - enable sharing, generate slug if needed
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

    const slug = session.shareSlug ?? nanoid(10);

    await updateSessionDB(client, id, {
      shareSlug: slug,
      isPublic: true,
    });

    return Response.json({ url: `${BASE_URL}/share/${slug}` });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]/share - disable sharing (keep slug for reuse)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

    await updateSessionDB(client, id, { isPublic: false });

    return Response.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
