import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { generateLink, createClientMock, afterTasks } = vi.hoisted(() => {
  const generateLink = vi.fn();
  const createClientMock = vi.fn(() => ({
    auth: {
      admin: { generateLink },
    },
  }));
  const afterTasks: Promise<unknown>[] = [];
  return { generateLink, createClientMock, afterTasks };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

// Stub `after` to run the callback synchronously and capture the resulting
// promise so each test can `await flushAfter()` before asserting on background effects.
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
const RESET_LINK = "https://test.supabase.co/auth/v1/verify?token=abc123&type=recovery&redirect_to=http://localhost:3000/reset-password";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mockFetch(ok = true) {
  return vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(ok ? '{"id":"email-id"}' : '{"error":"bad request"}', {
      status: ok ? 200 : 400,
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  generateLink.mockReset();
  generateLink.mockResolvedValue({
    data: { properties: { action_link: RESET_LINK } },
    error: null,
  });
  createClientMock.mockClear();
  afterTasks.length = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/auth/forgot-password", () => {
  it("generates a link and sends via Resend when user exists, pads response to ≥800ms", async () => {
    const fetchSpy = mockFetch();
    const start = Date.now();

    const res = await POST(makeRequest({ email: "real@example.com" }));
    const elapsed = Date.now() - start;
    await flushAfter();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(elapsed).toBeGreaterThanOrEqual(795);

    expect(generateLink).toHaveBeenCalledTimes(1);
    expect(generateLink).toHaveBeenCalledWith({
      type: "recovery",
      email: "real@example.com",
      options: { redirectTo: "http://localhost:3000/reset-password" },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(opts?.body as string);
    expect(body.to).toEqual(["real@example.com"]);
    expect(body.from).toContain("noreply@shak-tech.com");
    expect(body.html).toContain(RESET_LINK);
  });

  it("does NOT send when generateLink returns an error (user does not exist)", async () => {
    const fetchSpy = mockFetch();
    generateLink.mockResolvedValue({ data: null, error: { message: "User not found" } });

    const res = await POST(makeRequest({ email: "ghost@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does NOT send when generateLink returns no action_link", async () => {
    const fetchSpy = mockFetch();
    generateLink.mockResolvedValue({ data: { properties: {} }, error: null });

    const res = await POST(makeRequest({ email: "ghost@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("response time is independent of Resend send latency (no timing oracle)", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise((r) => setTimeout(() => r(new Response('{"id":"x"}', { status: 200 })), 3000)),
    );

    const t0 = Date.now();
    const res = await POST(makeRequest({ email: "slow-user@example.com" }));
    const elapsed = Date.now() - t0;

    expect(res.status).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(795);
    expect(elapsed).toBeLessThan(2000);

    await flushAfter();
  });

  it("returns the same response for an invalid email shape", async () => {
    const fetchSpy = mockFetch();
    const res = await POST(makeRequest({ email: "not-an-email" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(generateLink).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the same response for a missing email field", async () => {
    const fetchSpy = mockFetch();
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(generateLink).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the same response for a malformed JSON body", async () => {
    const fetchSpy = mockFetch();
    const res = await POST(makeRequest("not-json{"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("normalizes email to lowercase and trims whitespace", async () => {
    const fetchSpy = mockFetch();

    const res = await POST(makeRequest({ email: "  USER@Example.COM  " }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(generateLink).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.com" }),
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.to).toEqual(["user@example.com"]);
  });

  it("returns 200 ok:true and does not throw when generateLink throws", async () => {
    const fetchSpy = mockFetch();
    generateLink.mockRejectedValue(new Error("network down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest({ email: "real@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("logs but does not throw when Resend returns a non-ok response", async () => {
    mockFetch(false);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest({ email: "real@example.com" }));
    await flushAfter();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(errSpy).toHaveBeenCalledWith(
      "Forgot-password Resend send failed:",
      expect.any(String),
    );
    errSpy.mockRestore();
  });

  it("returns 200 ok:true when env vars are missing", async () => {
    vi.unstubAllEnvs();
    const fetchSpy = mockFetch();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest({ email: "real@example.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(generateLink).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
