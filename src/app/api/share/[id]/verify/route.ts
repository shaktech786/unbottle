/**
 * POST /api/share/[id]/verify
 * Verify a password for a password-protected share link.
 * Body: { password: string }
 * Returns: { valid: boolean }
 * No auth required — public endpoint.
 */

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifySharePassword } from "@/lib/share/password";

export const dynamic = "force-dynamic";

/**
 * Reads share_password_hash, which `anon` deliberately has no column grant on
 * (20260512000100). The comparison has to happen server-side; the hash must
 * never reach the client.
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  try {
    const client = getServiceClient();
    if (!client) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // This client bypasses RLS, so is_public is the only gate on the row -- it
    // must be checked before anything is returned or compared.
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
  } catch {
    // Don't echo the DB error: this endpoint is public and unauthenticated.
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
