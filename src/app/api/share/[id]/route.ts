import { createClient } from "@/lib/supabase/server";
import {
  getSession as getSessionDB,
} from "@/lib/supabase/db";
import { getSession as getSessionMemory } from "@/lib/session/store";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// GET /api/share/[id] - public read of a session's share metadata (no auth required)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      const session = await getSessionDB(client, id);
      if (!session) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json({
        id: session.id,
        title: session.title,
        genre: session.genre,
        mood: session.mood,
        bpm: session.bpm,
        keySignature: session.keySignature,
      });
    } catch {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  const session = getSessionMemory(id);
  if (!session) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({
    id: session.id,
    title: session.title,
    genre: session.genre,
    mood: session.mood,
    bpm: session.bpm,
    keySignature: session.keySignature,
  });
}
