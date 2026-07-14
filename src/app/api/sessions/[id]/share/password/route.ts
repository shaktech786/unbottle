/**
 * POST /api/sessions/[id]/share/password
 * Set or remove a password on a share link.
 * Body: { password: string | null }
 *   - string  → hashes with bcrypt (cost 10) and stores
 *   - null    → clears password
 *
 * Uses Node.js built-in crypto (scrypt) rather than a bcrypt dep to keep
 * the bundle lean. Hash format: "scrypt:N:r:p:salt:hash" where all values
 * are hex-encoded.
 */

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getSession as getSessionDB, updateSession as updateSessionDB } from "@/lib/supabase/db";
import { hashSharePassword } from "@/lib/share/password";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  try {
    const client = await createClient();
    const user = await requireAuth(client);

    const session = await getSessionDB(client, id);
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as { password?: string | null };
    const password = body.password ?? null;

    let passwordHash: string | null = null;
    if (typeof password === "string" && password.length > 0) {
      passwordHash = await hashSharePassword(password);
    }

    // Store in DB using a direct update (column not in Session type — raw query)
    const { error } = await client
      .from("sessions")
      .update({ share_password_hash: passwordHash })
      .eq("id", id);

    if (error) throw error;

    return Response.json({
      passwordProtected: passwordHash !== null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Authentication required") {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
