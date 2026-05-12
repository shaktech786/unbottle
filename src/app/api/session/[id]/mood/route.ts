import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export type SessionMoodRating = "stuck" | "distracted" | "okay" | "good" | "in_the_zone";

const VALID_MOODS: SessionMoodRating[] = ["stuck", "distracted", "okay", "good", "in_the_zone"];

interface MoodRequestBody {
  mood: SessionMoodRating;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const client = await createClient();
    const user = await requireAuth(client);

    const body = (await request.json()) as MoodRequestBody;
    if (!VALID_MOODS.includes(body.mood)) {
      return Response.json({ error: "Invalid mood value" }, { status: 400 });
    }

    const { data, error } = await client
      .from("session_moods")
      .insert({
        user_id: user.id,
        session_id: sessionId || null,
        mood: body.mood,
      })
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ mood: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const client = await createClient();
    const user = await requireAuth(client);

    const { data, error } = await client
      .from("session_moods")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Response.json({ moods: data });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
