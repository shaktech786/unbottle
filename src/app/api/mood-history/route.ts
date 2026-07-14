import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await createClient();
    const user = await requireAuth(client);

    const { data, error } = await client
      .from("session_moods")
      .select("id, mood, created_at, session_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    return Response.json({ moods: data ?? [] });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
