import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Pad every response to this minimum so an attacker cannot use response time
// to distinguish "user exists" from "user does not exist". Lookup + email
// send happen in `after()` so the response is always constant-time regardless
// of whether the email is real, the lookup is slow, or SMTP takes seconds.
const MIN_RESPONSE_MS = 800;

// Hard cap on how many users we'll scan when checking existence. GoTrue's
// admin REST endpoint silently ignores ?email= filters, so we paginate
// listUsers. 50,000 is well above expected scale and prevents runaway loops.
const ADMIN_USERS_PER_PAGE = 1000;
const ADMIN_MAX_PAGES = 50;

async function padTo(start: number) {
  const remaining = MIN_RESPONSE_MS - (Date.now() - start);
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }
}

async function userEmailExists(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
): Promise<boolean> {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (let page = 1; page <= ADMIN_MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: ADMIN_USERS_PER_PAGE,
    });
    if (error) return false;
    const users = data?.users ?? [];
    if (users.some((u) => u.email?.toLowerCase() === email)) return true;
    if (users.length < ADMIN_USERS_PER_PAGE) return false;
  }
  return false;
}

/**
 * POST /api/auth/forgot-password
 *
 * Always returns `{ ok: true }` after at least MIN_RESPONSE_MS, regardless of
 * whether the email exists, is malformed, or the body is garbage. This
 * prevents account enumeration: an attacker cannot learn from our response
 * (body or timing) which addresses are registered. We only actually send the
 * reset email when the user exists.
 */
export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const sameResponse = async () => {
    await padTo(startedAt);
    return NextResponse.json({ ok: true }, { status: 200 });
  };

  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim().toLowerCase();
  } catch {
    return sameResponse();
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sameResponse();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Forgot-password: missing Supabase env vars");
    return sameResponse();
  }

  // Defer the lookup + email send until after the response goes out so
  // response time is independent of (a) where the user lives in the user
  // list and (b) SMTP send latency. The capture of `email` is intentional —
  // TypeScript already narrowed it to string above.
  const origin = new URL(request.url).origin;
  after(async () => {
    try {
      const exists = await userEmailExists(supabaseUrl, serviceRoleKey, email);
      if (!exists) return;
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await anon.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/callback?type=recovery`,
      });
      if (error) {
        // The SDK returns errors as values rather than throwing — surface
        // them so SMTP misconfig / rate limits / etc. show up in server logs.
        console.error("Forgot-password reset email failed:", error);
      }
    } catch (err) {
      console.error("Forgot-password background work failed:", err);
    }
  });

  return sameResponse();
}
