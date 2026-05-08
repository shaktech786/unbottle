import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Test account fixtures
// ---------------------------------------------------------------------------

const TEST_EMAIL_PREFIX = "e2e-auth-test";
const TEST_PASSWORD = "TestPass123!";

// Generated once per worker run — unique enough to avoid collisions between
// parallel runs on the same project.
function testEmail(tag: string) {
  return `${TEST_EMAIL_PREFIX}-${tag}-${Date.now()}@example.com`;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run auth E2E tests",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

// Auth specs intentionally start unauthenticated — clear the global storageState
// set by global-setup so these tests aren't pre-logged-in.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("signup", () => {
  let createdUserId: string | undefined;
  const email = testEmail("signup");

  test.afterAll(async () => {
    if (createdUserId) {
      await adminClient().auth.admin.deleteUser(createdUserId);
    }
  });

  test("shows 'check your email' confirmation after submitting the form", async ({
    page,
  }) => {
    await page.goto("/signup");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirm password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    // Supabase sends a confirmation email by default; app shows this state
    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible({ timeout: 10_000 });

    // Record the user id so afterAll can clean up
    const admin = adminClient();
    const { data } = await admin.auth.admin.listUsers();
    const user = data?.users?.find((u) => u.email === email);
    createdUserId = user?.id;
  });
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

test.describe("login", () => {
  let userId: string;
  let loginEmail: string;

  test.beforeAll(async () => {
    loginEmail = testEmail("login");
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create test user: ${error.message}`);
    userId = data.user.id;
  });

  test.afterAll(async () => {
    if (userId) {
      await adminClient().auth.admin.deleteUser(userId);
    }
  });

  test("redirects to /dashboard after valid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(loginEmail);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("shows an error message for wrong password", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(loginEmail);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Supabase returns a human-readable error; the form renders it in a div
    await expect(page.locator("text=Invalid login credentials")).toBeVisible({
      timeout: 8_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe("logout", () => {
  let userId: string;
  let logoutEmail: string;

  test.beforeAll(async () => {
    logoutEmail = testEmail("logout");
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: logoutEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create test user: ${error.message}`);
    userId = data.user.id;
  });

  test.afterAll(async () => {
    if (userId) {
      await adminClient().auth.admin.deleteUser(userId);
    }
  });

  test("clicking Log out redirects to /login and blocks access to /dashboard", async ({
    page,
  }) => {
    // Sign in first
    await page.goto("/login");
    await page.getByLabel("Email").fill(logoutEmail);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Click the Log out button in the sidebar
    await page.getByRole("button", { name: "Log out" }).click();

    // Must land on login
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });

    // Attempting to access a protected route must redirect back to login
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

test.describe("forgot password", () => {
  test("shows confirmation message after submitting an email", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByLabel("Email").fill("any-address@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    // The page always shows the success state regardless of whether the
    // email exists (intentional — prevents email enumeration)
    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("any-address@example.com")).toBeVisible();
  });
});
