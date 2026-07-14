import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import path from "path";

const AUTH_STATE_PATH = path.resolve(__dirname, ".e2e-auth.json");

const TEST_EMAIL = `e2e-global-${Date.now()}@example.com`;
const TEST_PASSWORD = "E2eGlobal123!";

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run E2E tests",
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create the test user with email already confirmed
  const { data: createData, error: createError } =
    await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

  if (createError) {
    throw new Error(`Failed to create E2E test user: ${createError.message}`);
  }

  const userId = createData.user.id;

  // Sign in to get a real session
  const { data: signInData, error: signInError } =
    await admin.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

  if (signInError || !signInData.session) {
    throw new Error(
      `Failed to sign in E2E test user: ${signInError?.message ?? "no session returned"}`,
    );
  }

  const { access_token, refresh_token } = signInData.session;

  // Playwright storageState format — localStorage key used by supabase-js v2
  const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;

  const authState = {
    cookies: [] as unknown[],
    origins: [
      {
        origin: "http://localhost:3000",
        localStorage: [
          {
            name: storageKey,
            value: JSON.stringify({
              access_token,
              refresh_token,
              token_type: "bearer",
              expires_in: signInData.session.expires_in,
              expires_at: signInData.session.expires_at,
              user: signInData.session.user,
            }),
          },
        ],
      },
    ],
  };

  writeFileSync(AUTH_STATE_PATH, JSON.stringify(authState, null, 2));

  // Expose credentials for tests that need to call the admin API directly
  process.env.E2E_TEST_USER_ID = userId;
  process.env.E2E_TEST_EMAIL = TEST_EMAIL;
  process.env.E2E_TEST_PASSWORD = TEST_PASSWORD;
}
