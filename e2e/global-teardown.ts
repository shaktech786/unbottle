import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, unlinkSync } from "fs";
import path from "path";

const AUTH_STATE_PATH = path.resolve(__dirname, ".e2e-auth.json");

export default async function globalTeardown() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Env vars missing — nothing to clean up
    return;
  }

  // Read the user id from the auth state written during setup
  let userId: string | undefined;

  if (existsSync(AUTH_STATE_PATH)) {
    try {
      const raw = readFileSync(AUTH_STATE_PATH, "utf-8");
      const state = JSON.parse(raw) as {
        origins: { localStorage: { name: string; value: string }[] }[];
      };

      const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
      const localStorage = state.origins?.[0]?.localStorage ?? [];
      const entry = localStorage.find((item) => item.name === storageKey);

      if (entry) {
        const session = JSON.parse(entry.value) as { user?: { id?: string } };
        userId = session?.user?.id;
      }
    } catch {
      // Malformed file — fall through to deletion only
    }

    unlinkSync(AUTH_STATE_PATH);
  }

  if (!userId) {
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    // Non-fatal: user may have been deleted by a test; log and continue
    console.warn(`E2E teardown: failed to delete user ${userId}: ${error.message}`);
  }
}
