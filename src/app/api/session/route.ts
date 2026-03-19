import { type NextRequest } from "next/server";
import {
  listSessions as listSessionsMemory,
  createSession as createSessionMemory,
  addTrack as addTrackMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  listSessions as listSessionsDB,
  createSession as createSessionDB,
  addTrack as addTrackDB,
} from "@/lib/supabase/db";

// MVP mock user ID for in-memory fallback
const MOCK_USER_ID = "user_mvp_001";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// GET /api/session - list sessions sorted by lastActiveAt desc
export async function GET() {
  if (supabaseConfigured) {
    try {
      const client = await createClient();
      const user = await requireAuth(client);
      const sessions = await listSessionsDB(client, user.id);
      return Response.json({ sessions });
    } catch (err) {
      if (err instanceof Error && err.message === "Authentication required") {
        return Response.json({ error: "Authentication required" }, { status: 401 });
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // Fallback: in-memory store
  const sessions = listSessionsMemory(MOCK_USER_ID);
  return Response.json({ sessions });
}

// POST /api/session - create a new session with defaults
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine, we use defaults
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : `Session ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;

  const sessionData = {
    title,
    description:
      typeof body.description === "string" ? body.description : undefined,
    status: "active" as const,
    bpm: typeof body.bpm === "number" ? body.bpm : 120,
    keySignature:
      typeof body.keySignature === "string" ? body.keySignature : "C",
    timeSignature:
      typeof body.timeSignature === "string" ? body.timeSignature : "4/4",
    genre: typeof body.genre === "string" ? body.genre : undefined,
    mood: typeof body.mood === "string" ? body.mood : undefined,
  };

  const defaultTrack = {
    name: "Track 1",
    instrument: "synth" as const,
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    color: "#6366f1",
    sortOrder: 0,
  };

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      const user = await requireAuth(client);
      const session = await createSessionDB(client, user.id, sessionData);
      await addTrackDB(client, session.id, defaultTrack);
      return Response.json({ session }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === "Authentication required") {
        return Response.json({ error: "Authentication required" }, { status: 401 });
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // Fallback: in-memory store
  const session = createSessionMemory({
    userId: MOCK_USER_ID,
    ...sessionData,
  });
  addTrackMemory(session.id, defaultTrack);
  return Response.json({ session }, { status: 201 });
}
