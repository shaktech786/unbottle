import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes reachable without a session, matched exactly.
 *
 * Legal pages belong here: /signup links to them, so gating them behind auth
 * means nobody can read the terms they are agreeing to.
 */
const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/cookies",
]);

/**
 * Route families reachable without a session, matched by prefix.
 *
 * These cannot be exact matches, which is what broke them:
 * - /share/[slug] is read by signed-out visitors by definition
 * - /auth/callback receives the OAuth code *before* a session cookie exists, so
 *   requiring a session here means the code exchange never runs and Google
 *   sign-in silently bounces to /login
 * - /api/* routes authenticate individually; middleware-level auth on API routes
 *   is a known Next.js footgun, so they stay public here on purpose
 */
const PUBLIC_PREFIXES = ["/share/", "/auth/callback", "/api/"];

export function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except public routes)
  if (!user && !isPublicRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
