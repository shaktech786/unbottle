import { createClient } from "@/lib/supabase/server";
import {
  getSessionBySlug,
  getLatestAudioCapture,
} from "@/lib/supabase/db";
import { getSession as getSessionMemory } from "@/lib/session/store";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

// 7 days in seconds
const SIGNED_URL_TTL = 7 * 24 * 60 * 60;

export const dynamic = "force-dynamic";

// GET /api/share/[id] - public read of a session's share metadata (no auth required)
// `id` is the share_slug, not the session id — only public sessions are returned.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      const session = await getSessionBySlug(client, id);
      if (!session || !session.isPublic) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      let audioUrl: string | null = null;

      const capture = await getLatestAudioCapture(client, session.id);
      if (capture?.audioUrl) {
        // audio_url is stored as /api/audio/{captureId}; extract the captureId
        const captureId = capture.audioUrl.split("/").pop();
        if (captureId) {
          const storagePath = `${session.userId}/${captureId}.webm`;
          const { data: signed } = await client.storage
            .from("captures")
            .createSignedUrl(storagePath, SIGNED_URL_TTL);
          audioUrl = signed?.signedUrl ?? null;
        }
      }

      return Response.json({
        id: session.id,
        title: session.title,
        genre: session.genre,
        mood: session.mood,
        bpm: session.bpm,
        keySignature: session.keySignature,
        audioUrl,
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
    audioUrl: null,
  });
}
