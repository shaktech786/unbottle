import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/forgot-password
 *
 * Always returns the same response regardless of whether the email exists.
 * This prevents account enumeration: an attacker who tries random emails
 * cannot tell from our response which ones have accounts. We only actually
 * send the reset email if the user exists, so we never spam non-users.
 */
/**
 * Pad the response so it always takes at least this many ms. Without this,
 * a real email (lookup + send) takes ~700ms and a fake email (lookup only)
 * takes ~60ms — a timing oracle that lets attackers enumerate accounts even
 * when the response body is identical.
 */
const MIN_RESPONSE_MS = 800;

async function padTo(start: number) {
  const elapsed = Date.now() - start;
  const remaining = MIN_RESPONSE_MS - elapsed;
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const sameBody = { ok: true };
  const sameResponse = async () => {
    await padTo(startedAt);
    return NextResponse.json(sameBody, { status: 200 });
  };

  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim().toLowerCase();
  } catch {
    return sameResponse();
  }

  // Basic shape check — invalid emails get the same response, no error
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sameResponse();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    // Misconfiguration is silent to clients — would surface in server logs
    console.error("Forgot-password: missing Supabase env vars");
    return sameResponse();
  }

  // 1. Look up the user via the admin REST API. The JS SDK only exposes
  //    paginated listUsers, so we hit /auth/v1/admin/users?email=... directly.
  let userExists = false;
  try {
    const lookup = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );
    if (lookup.ok) {
      const data = (await lookup.json()) as { users?: Array<{ email?: string }> };
      userExists = (data.users ?? []).some(
        (u) => u.email?.toLowerCase() === email,
      );
    }
  } catch (err) {
    console.error("Forgot-password lookup failed:", err);
    return sameResponse();
  }

  if (!userExists) {
    return sameResponse();
  }

  // 2. User exists — fire the reset email. Use the anon client so the email
  //    is sent through Supabase's normal recovery flow with the standard
  //    template, redirecting back through our /callback?type=recovery route.
  try {
    const anon = createAdminClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const origin = new URL(request.url).origin;
    await anon.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/callback?type=recovery`,
    });
  } catch (err) {
    console.error("Forgot-password send failed:", err);
  }

  return sameResponse();
}
