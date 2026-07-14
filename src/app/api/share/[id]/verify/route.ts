/**
 * POST /api/share/[id]/verify
 * Verify a password for a password-protected share link.
 * Body: { password: string }
 * Returns: { valid: boolean }
 * No auth required — public endpoint.
 */

import { createClient } from "@/lib/supabase/server";
import { getSessionBySlug } from "@/lib/supabase/db";
import { verifySharePassword } from "@/lib/share/password";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  try {
    const client = await createClient();

    // Fetch the session (by slug) including password_hash
    const { data, error } = await client
      .from("sessions")
      .select("id, is_public, share_password_hash")
      .eq("share_slug", id)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.is_public) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // No password set — always valid
    if (!data.share_password_hash) {
      return Response.json({ valid: true });
    }

    const body = await request.json() as { password?: string };
    const password = body.password ?? "";

    const valid = await verifySharePassword(password, data.share_password_hash);
    return Response.json({ valid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
