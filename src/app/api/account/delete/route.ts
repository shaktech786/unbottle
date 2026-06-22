import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const STORAGE_BUCKETS = ["captures", "exports"] as const;

/**
 * POST /api/account/delete
 *
 * Permanently deletes the authenticated user's account. Deleting the auth user
 * cascades through profiles → sessions → all child tables, so this also removes
 * every database row owned by the user. Storage objects are not covered by the
 * cascade, so they are removed explicitly first.
 */
export async function POST(): Promise<Response> {
  let user;
  try {
    const client = await createServerClient();
    user = await requireAuth(client);
  } catch {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: "Account deletion is not available" },
      { status: 503 },
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Remove the user's files from each storage bucket (folder = user id).
  for (const bucket of STORAGE_BUCKETS) {
    const { data: files } = await admin.storage.from(bucket).list(user.id);
    if (files?.length) {
      await admin.storage
        .from(bucket)
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
