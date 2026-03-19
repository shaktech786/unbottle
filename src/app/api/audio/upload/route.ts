import { type NextRequest } from "next/server";
import { generateId } from "@/lib/session/store";

export const dynamic = "force-dynamic";

// TODO: Replace in-memory buffer with Supabase Storage once configured.
// This MVP stores audio blobs in memory and returns a local reference URL.
const audioBuffer = new Map<string, { blob: Blob; sessionId: string; createdAt: string }>();

// POST /api/audio/upload - upload an audio blob for a session
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Request must be multipart/form-data" },
      { status: 400 },
    );
  }

  const audio = formData.get("audio");
  const sessionId = formData.get("sessionId");

  if (!audio || !(audio instanceof Blob)) {
    return Response.json(
      { error: "audio field is required and must be a file/blob" },
      { status: 400 },
    );
  }

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return Response.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }

  const captureId = generateId();

  // Store in memory for MVP
  audioBuffer.set(captureId, {
    blob: audio,
    sessionId: sessionId.trim(),
    createdAt: new Date().toISOString(),
  });

  // TODO: Upload to Supabase Storage and return real public URL
  const url = `/api/audio/${captureId}`;

  return Response.json({ url, captureId }, { status: 201 });
}
