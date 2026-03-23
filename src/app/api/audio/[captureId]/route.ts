import { type NextRequest } from "next/server";
import { audioBuffer } from "@/lib/audio/buffer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

// GET /api/audio/[captureId] - serve or redirect to audio
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ captureId: string }> },
) {
  const { captureId } = await params;

  if (!captureId) {
    return Response.json({ error: "captureId is required" }, { status: 400 });
  }

  if (supabaseConfigured) {
    try {
      const client = await createClient();

      // Try authenticated user path first, then anonymous
      const user = await getCurrentUser(client);
      const userId = user?.id ?? "anonymous";

      const storagePath = `${userId}/${captureId}.webm`;

      // Bucket is private — create a short-lived signed URL
      const { data: signedData, error: signedError } = await client.storage
        .from("captures")
        .createSignedUrl(storagePath, 3600); // 1 hour

      if (signedError || !signedData?.signedUrl) {
        return Response.json({ error: "Audio not found" }, { status: 404 });
      }

      return Response.redirect(signedData.signedUrl, 302);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("Audio retrieval error:", message);
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // Fallback: serve from in-memory buffer
  const entry = audioBuffer.get(captureId);
  if (!entry) {
    return Response.json({ error: "Audio not found" }, { status: 404 });
  }

  const arrayBuffer = await entry.blob.arrayBuffer();

  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": entry.blob.type || "audio/webm",
      "Content-Length": String(arrayBuffer.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
