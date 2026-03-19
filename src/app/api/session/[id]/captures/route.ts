import { type NextRequest } from "next/server";
import {
  getCaptures as getCapturesMemory,
  addCapture as addCaptureMemory,
} from "@/lib/session/store";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import {
  getCaptures as getCapturesDB,
  addCapture as addCaptureDB,
} from "@/lib/supabase/db";
import type { CaptureData } from "@/lib/music/types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const dynamic = "force-dynamic";

// GET /api/session/[id]/captures -- list captures for this session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);
      const captures = await getCapturesDB(client, id);
      return Response.json({ captures });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json({ captures: [] });
    }
  }

  const captures = getCapturesMemory(id);
  return Response.json({ captures });
}

// POST /api/session/[id]/captures -- save a capture
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<CaptureData>;

  if (!body.type || !["audio", "tap", "text"].includes(body.type)) {
    return Response.json(
      { error: "type must be one of: audio, tap, text" },
      { status: 400 },
    );
  }

  const captureData: Omit<CaptureData, "id" | "sessionId" | "createdAt"> = {
    type: body.type,
    audioUrl: body.audioUrl,
    transcription: body.transcription,
    detectedNotes: body.detectedNotes,
    detectedRhythm: body.detectedRhythm,
    textDescription: body.textDescription,
    durationMs: body.durationMs,
  };

  if (supabaseConfigured) {
    try {
      const client = await createClient();
      await requireAuth(client);
      const capture = await addCaptureDB(client, id, captureData);
      return Response.json({ capture }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Not authenticated")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json(
        { error: "Failed to save capture" },
        { status: 500 },
      );
    }
  }

  // In-memory fallback
  const capture = addCaptureMemory(id, captureData);
  return Response.json({ capture }, { status: 201 });
}
