import { type NextRequest } from "next/server";
import {
  addTrack as addTrackMemory,
  getTracks as getTracksMemory,
  updateTrack as updateTrackMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  addTrack as addTrackDB,
  updateTrack as updateTrackDB,
} from "@/lib/supabase/db";
import type { InstrumentType } from "@/lib/music/types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// POST /api/session/[id]/tracks -- add a new track
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const body = (await request.json()) as {
    name?: string;
    instrument?: string;
  };

  if (!body.name || !body.instrument) {
    return Response.json(
      { error: "name and instrument are required" },
      { status: 400 },
    );
  }

  const existingTracks = supabaseConfigured ? [] : getTracksMemory(sessionId);
  const sortOrder = existingTracks.length;

  const trackData = {
    name: body.name,
    instrument: body.instrument as InstrumentType,
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    color: "#8b5cf6",
    sortOrder,
  };

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);
      const track = await addTrackDB(client, sessionId, trackData);
      return Response.json({ track }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // In-memory fallback
  const track = addTrackMemory(sessionId, trackData);
  return Response.json({ track }, { status: 201 });
}

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
