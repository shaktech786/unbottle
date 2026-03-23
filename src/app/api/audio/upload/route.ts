import { type NextRequest } from "next/server";
import { generateId } from "@/lib/session/store";
import { audioBuffer } from "@/lib/audio/buffer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

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

  if (supabaseConfigured) {
    try {
      const client = await createClient();

      // Use authenticated userId when available, fall back to "anonymous"
      const user = await getCurrentUser(client);
      const userId = user?.id ?? "anonymous";

      const storagePath = `${userId}/${captureId}.webm`;
      const arrayBuffer = await audio.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await client.storage
        .from("captures")
        .upload(storagePath, buffer, {
          contentType: audio.type || "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);
        return Response.json(
          { error: "Failed to upload audio" },
          { status: 500 },
        );
      }

      // Return our proxy route URL — the bucket is private, so we use
      // signed URLs on-demand in the retrieval route instead of public URLs.
      const url = `/api/audio/${captureId}`;

      return Response.json({ url, captureId }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("Audio upload error:", message);
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // Fallback: in-memory store for local dev without Supabase
  audioBuffer.set(captureId, {
    blob: audio,
    sessionId: sessionId.trim(),
    createdAt: new Date().toISOString(),
  });

  const url = `/api/audio/${captureId}`;

  return Response.json({ url, captureId }, { status: 201 });
}
