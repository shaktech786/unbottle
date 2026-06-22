import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

// Tables that hold user data. RLS scopes every select to the current user,
// either directly (user_id) or via the session relationship.
const USER_TABLES = [
  "profiles",
  "sessions",
  "sections",
  "tracks",
  "notes",
  "chat_messages",
  "captures",
  "bookmarks",
  "subscriptions",
  "usage_logs",
  "style_profiles",
  "session_moods",
] as const;

/**
 * GET /api/account/export
 *
 * Returns a JSON archive of all data associated with the authenticated user,
 * satisfying the data-portability commitment in the Privacy Policy.
 */
export async function GET(): Promise<Response> {
  try {
    const client = await createClient();
    const user = await requireAuth(client);

    const data: Record<string, unknown> = {};
    for (const table of USER_TABLES) {
      const { data: rows, error } = await client.from(table).select("*");
      data[table] = error ? { error: error.message } : rows;
    }

    const archive = {
      exportedAt: new Date().toISOString(),
      user: { id: user.id, email: user.email },
      data,
    };

    return new Response(JSON.stringify(archive, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="unbottle-data-export.json"`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
