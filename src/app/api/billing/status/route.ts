import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const AI_CALL_LIMIT_FREE = 50;
const AI_CALL_LIMIT_PRO = 1000;
const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export async function GET() {
  if (!supabaseConfigured) {
    return Response.json({
      plan: "free",
      usage: { aiCalls: 0, limit: AI_CALL_LIMIT_FREE },
    });
  }

  try {
    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Determine plan from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    const plan: "free" | "pro" =
      (profile as { plan?: string } | null)?.plan === "pro" ? "pro" : "free";
    const limit = plan === "pro" ? AI_CALL_LIMIT_PRO : AI_CALL_LIMIT_FREE;

    // Count AI (user-role) chat messages in the current calendar month
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString();

    let aiCalls = 0;
    try {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", user.id);

      if (sessions && sessions.length > 0) {
        const sessionIds = (sessions as { id: string }[]).map((s) => s.id);
        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .in("session_id", sessionIds)
          .eq("role", "user")
          .gte("created_at", monthStart);

        aiCalls = count ?? 0;
      }
    } catch {
      // chat_messages table may not exist yet — return 0
    }

    return Response.json({ plan, usage: { aiCalls, limit } });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
