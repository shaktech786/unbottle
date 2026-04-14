import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { listUsers, resetPasswordForEmail, createClientMock, afterTasks } =
  vi.hoisted(() => {
    const listUsers = vi.fn();
    const resetPasswordForEmail = vi.fn();
    const createClientMock = vi.fn(() => ({
      auth: {
        admin: { listUsers },
        resetPasswordForEmail,
      },
    }));
    const afterTasks: Promise<unknown>[] = [];
    return { listUsers, resetPasswordForEmail, createClientMock, afterTasks };
  });

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

// Stub `after` to run the callback synchronously and capture the resulting
// promise so each test can `await flushAfter()` before asserting on the
// background side-effects (lookup / email send).
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (cb: () => unknown) => {
      const result = cb();
      if (result instanceof Promise) afterTasks.push(result);
    },
  };
});

async function flushAfter() {
  while (afterTasks.length > 0) {
    const tasks = afterTasks.splice(0, afterTasks.length);
    await Promise.allSettled(tasks);
  }
}

import { POST } from "./route";

const SUPABASE_URL = "https://test.supabase.co";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function singlePage(emails: string[]) {
  // Returns fewer than perPage so the route stops paginating after one call.
  listUsers.mockResolvedValueOnce({
    data: { users: emails.map((email) => ({ email })) },
    error: null,
  });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  listUsers.mockReset();
  resetPasswordForEmail.mockReset();
  resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  createClientMock.mockClear();
  afterTasks.length = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/forgot-password", () => {
  it("sends a reset email and pads response to ≥800ms when the user exists", async () => {
    singlePage(["real@example.com"]);
    const start = Date.now();

    const res = await POST(makeRequest({ email: "real@example.com" }));
    const elapsed = Date.now() - start;
    await flushAfter();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(elapsed).toBeGreaterThanOrEqual(795);
    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(listUsers).toHaveBeenCalledWith({ page: 1, perPage: 1000 });
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1);
    expect(resetPasswordForEmail).toHaveBeenCalledWith("real@example.com", {
      redirectTo: "http://localhost:3000/callback?type=recovery",
    });
  });

  it("does NOT send a reset email when the user is not in the directory (security fix e863184)", async () => {
    singlePage(["someone-else@example.com"]);

    const res = await POST(makeRequest({ email: "ghost@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("response time is independent of email-send latency (no timing oracle)", async () => {
    // Real user: SMTP send is artificially slow (3 seconds).
    singlePage(["slow-user@example.com"]);
    resetPasswordForEmail.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ data: {}, error: null }), 3000)),
    );

    const t0 = Date.now();
    const res = await POST(makeRequest({ email: "slow-user@example.com" }));
    const elapsed = Date.now() - t0;

    expect(res.status).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(795);
    // The response must NOT have waited for the 3-second SMTP send.
    expect(elapsed).toBeLessThan(2000);

    // The background work still runs; flush so we don't leak timers.
    await flushAfter();
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1);
  });

  it("paginates listUsers and finds users beyond page 1", async () => {
    // Page 1: 1000 unrelated users (full page → keep paginating)
    listUsers.mockResolvedValueOnce({
      data: {
        users: Array.from({ length: 1000 }, (_, i) => ({
          email: `user${i}@example.com`,
        })),
      },
      error: null,
    });
    // Page 2: target user (partial page → stop)
    singlePage(["target@example.com"]);

    const res = await POST(makeRequest({ email: "target@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 1000 });
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 });
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1);
  });

  it("stops paginating after a partial page even if user not found", async () => {
    singlePage(["a@example.com", "b@example.com"]);

    const res = await POST(makeRequest({ email: "ghost@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("returns the same response and skips lookup for an invalid email shape", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(listUsers).not.toHaveBeenCalled();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("returns the same response for a missing email field", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(listUsers).not.toHaveBeenCalled();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("returns the same response for a malformed JSON body", async () => {
    const res = await POST(makeRequest("not-json{"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(listUsers).not.toHaveBeenCalled();
  });

  it("normalizes email to lowercase and trims whitespace", async () => {
    singlePage(["user@example.com"]);

    const res = await POST(makeRequest({ email: "  USER@Example.COM  " }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "http://localhost:3000/callback?type=recovery",
    });
  });

  it("returns 200 ok:true and does not throw when listUsers throws", async () => {
    listUsers.mockRejectedValue(new Error("network down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest({ email: "real@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("returns 200 ok:true when listUsers returns an error", async () => {
    listUsers.mockResolvedValue({
      data: { users: [] },
      error: new Error("permission denied"),
    });

    const res = await POST(makeRequest({ email: "real@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("logs but does not throw when resetPasswordForEmail returns an error value", async () => {
    singlePage(["real@example.com"]);
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { name: "AuthApiError", message: "over_email_send_rate_limit", status: 429 },
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest({ email: "real@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalledWith(
      "Forgot-password reset email failed:",
      expect.objectContaining({ message: "over_email_send_rate_limit" }),
    );
    errSpy.mockRestore();
  });

  it("returns 200 ok:true when env vars are missing", async () => {
    vi.unstubAllEnvs();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest({ email: "real@example.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(listUsers).not.toHaveBeenCalled();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
