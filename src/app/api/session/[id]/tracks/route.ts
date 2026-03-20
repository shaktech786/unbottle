import { type NextRequest } from "next/server";
import { updateTrack as updateTrackMemory } from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { updateTrack as updateTrackDB } from "@/lib/supabase/db";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const body = (await request.json()) as {
    trackId?: string;
    updates?: Record<string, unknown>;
  };

  if (!body.trackId || !body.updates) {
    return Response.json(
      { error: "trackId and updates are required" },
      { status: 400 },
    );
  }

  const allowedFields = ["name", "instrument", "volume", "pan", "muted", "solo", "color"];
  const filtered: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body.updates) {
      filtered[key] = body.updates[key];
    }
  }

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);
      const track = await updateTrackDB(client, body.trackId, filtered);
      if (!track) {
        return Response.json({ error: "Track not found" }, { status: 404 });
      }
      return Response.json({ track });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // In-memory fallback
  const track = updateTrackMemory(body.trackId, sessionId, filtered);
  if (!track) {
    return Response.json({ error: "Track not found" }, { status: 404 });
  }
  return Response.json({ track });
}
