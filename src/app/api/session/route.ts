import { type NextRequest } from "next/server";
import {
  listSessions,
  createSession,
  addTrack,
} from "@/lib/session/store";

// MVP mock user ID until auth is wired
const MOCK_USER_ID = "user_mvp_001";

export const dynamic = "force-dynamic";

// GET /api/session - list sessions sorted by lastActiveAt desc
export async function GET() {
  const sessions = listSessions(MOCK_USER_ID);
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

  const session = createSession({
    userId: MOCK_USER_ID,
    title,
    description:
      typeof body.description === "string" ? body.description : undefined,
    status: "active",
    bpm: typeof body.bpm === "number" ? body.bpm : 120,
    keySignature:
      typeof body.keySignature === "string" ? body.keySignature : "C",
    timeSignature:
      typeof body.timeSignature === "string" ? body.timeSignature : "4/4",
    genre: typeof body.genre === "string" ? body.genre : undefined,
    mood: typeof body.mood === "string" ? body.mood : undefined,
  });

  // Create a default track
  addTrack(session.id, {
    name: "Track 1",
    instrument: "synth",
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    color: "#6366f1",
    sortOrder: 0,
  });

  return Response.json({ session }, { status: 201 });
}
