import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string | undefined;
}

/**
 * Returns the currently authenticated user, or null if not logged in.
 */
export async function getCurrentUser(
  client: SupabaseClient,
): Promise<AuthUser | null> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) return null;

  return { id: user.id, email: user.email };
}

/**
 * Returns the authenticated user or throws.
 * Use in API routes where authentication is required.
 */
export async function requireAuth(client: SupabaseClient): Promise<AuthUser> {
  const user = await getCurrentUser(client);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}
