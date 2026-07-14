import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  createClientMock,
  requireAuthMock,
  generateCompletionFullMock,
  getUserApiKeyMock,
  checkRateLimitMock,
  logUsageMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(async () => ({ __fake: "client" })),
  requireAuthMock: vi.fn(),
  generateCompletionFullMock: vi.fn(),
  getUserApiKeyMock: vi.fn(() => undefined as string | undefined),
  checkRateLimitMock: vi.fn(async (): Promise<{ allowed: boolean; retryAfter?: number }> => ({
    allowed: true,
  })),
  logUsageMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/supabase/auth", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/ai/claude", () => ({
  generateCompletionFull: generateCompletionFullMock,
  getUserApiKey: getUserApiKeyMock,
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/log-usage", () => ({
  logUsage: logUsageMock,
}));

const SUPABASE_URL = "https://test.supabase.co";

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/vibe/chords", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const VALID_VIBE = { mood: "dreamy", energy: 3 };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  requireAuthMock.mockReset();
  generateCompletionFullMock.mockReset();
  generateCompletionFullMock.mockResolvedValue({
    text: JSON.stringify({ chords: ["Cmaj7", "Am7", "Fmaj7", "G7"], key: "C major", bpm: 90 }),
    model: "claude-sonnet-5",
    usage: { input_tokens: 10, output_tokens: 20 },
  });
  getUserApiKeyMock.mockReset();
  getUserApiKeyMock.mockReturnValue(undefined);
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue({ allowed: true });
  logUsageMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function importRoute() {
  return await import("./route");
}

describe("POST /api/vibe/chords", () => {
  it("returns 401 when unauthenticated and no BYO key is present", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { POST } = await importRoute();

    const res = await POST(makeRequest(VALID_VIBE));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Authentication required" });
    expect(generateCompletionFullMock).not.toHaveBeenCalled();
  });

  it("returns a chord progression for an authenticated request (happy path)", async () => {
    requireAuthMock.mockResolvedValueOnce({ id: "user-1", email: "u@example.com" });
    const { POST } = await importRoute();

    const res = await POST(makeRequest(VALID_VIBE));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ chords: ["Cmaj7", "Am7", "Fmaj7", "G7"], key: "C major", bpm: 90 });
    expect(generateCompletionFullMock).toHaveBeenCalledTimes(1);
    expect(checkRateLimitMock).toHaveBeenCalledWith("user-1", "chat");
    expect(logUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", endpoint: "/api/vibe/chords" }),
    );
  });

  it("works with a BYO API key when Supabase auth is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    getUserApiKeyMock.mockReturnValue("user-supplied-key");
    const { POST } = await importRoute();

    const res = await POST(makeRequest(VALID_VIBE, { "x-anthropic-key": "user-supplied-key" }));

    expect(res.status).toBe(200);
    expect(requireAuthMock).not.toHaveBeenCalled();
    expect(generateCompletionFullMock).toHaveBeenCalledTimes(1);
    expect(logUsageMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the rate limit is exceeded for an authenticated request", async () => {
    requireAuthMock.mockResolvedValueOnce({ id: "user-1", email: "u@example.com" });
    checkRateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfter: 120 });
    const { POST } = await importRoute();

    const res = await POST(makeRequest(VALID_VIBE));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    expect(generateCompletionFullMock).not.toHaveBeenCalled();
  });
});
