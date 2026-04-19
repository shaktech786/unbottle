import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Auth-gate regression tests (commit 3daabd4).
 *
 * Each gated API route calls `requireAuth(client)` before performing any
 * downstream work (AI call, audio upload, chat stream). These tests verify:
 *
 *   1. When `requireAuth()` throws, the downstream work is NOT invoked.
 *   2. With valid auth, the route proceeds (non-401, downstream invoked).
 *
 * Status code contract: all gated routes return 401 with
 * `{ error: "Authentication required" }` when `requireAuth()` fails.
 * Other errors continue to return 500.
 */

const {
  createClientMock,
  requireAuthMock,
  generateCompletionMock,
  generateMusicMock,
  getUserApiKeyMock,
  getUserElevenLabsKeyMock,
  getClaudeClientMock,
  supabaseStorageUploadMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(async () => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
      })),
    },
  })),
  requireAuthMock: vi.fn(),
  generateCompletionMock: vi.fn(),
  generateMusicMock: vi.fn(),
  getUserApiKeyMock: vi.fn(() => undefined),
  getUserElevenLabsKeyMock: vi.fn(() => undefined),
  getClaudeClientMock: vi.fn(),
  supabaseStorageUploadMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));
vi.mock("@/lib/supabase/auth", () => ({
  requireAuth: requireAuthMock,
}));
vi.mock("@/lib/ai/claude", () => ({
  generateCompletion: generateCompletionMock,
  getUserApiKey: getUserApiKeyMock,
  getClaudeClient: getClaudeClientMock,
}));
vi.mock("@/lib/audio/elevenlabs", () => ({
  generateMusic: generateMusicMock,
  getUserElevenLabsKey: getUserElevenLabsKeyMock,
}));

const SUPABASE_URL = "https://test.supabase.co";

function jsonReq(body: unknown): Request {
  return new Request("http://localhost:3000/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  requireAuthMock.mockReset();
  generateCompletionMock.mockReset();
  generateMusicMock.mockReset();
  supabaseStorageUploadMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("POST /api/arrangement/generate — auth gate", () => {
  it("does NOT call Claude when requireAuth throws", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { POST } = await import("./arrangement/generate/route");
    const res = await POST(jsonReq({ prompt: "hello" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Authentication required");
    expect(generateCompletionMock).not.toHaveBeenCalled();
  });

  it("calls Claude when auth succeeds (non-401 path)", async () => {
    requireAuthMock.mockResolvedValueOnce({ id: "u1", email: "u@x.com" });
    generateCompletionMock.mockResolvedValueOnce(
      JSON.stringify({ sections: [], suggestions: [] }),
    );
    const { POST } = await import("./arrangement/generate/route");
    const res = await POST(jsonReq({ prompt: "hello" }));
    expect(res.status).not.toBe(401);
    expect(generateCompletionMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/arrangement/suggest — auth gate", () => {
  it("does NOT call Claude when requireAuth throws", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { POST } = await import("./arrangement/suggest/route");
    const res = await POST(jsonReq({ sessionState: { bpm: 120 } }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Authentication required");
    expect(generateCompletionMock).not.toHaveBeenCalled();
  });

  it("calls Claude when auth succeeds", async () => {
    requireAuthMock.mockResolvedValueOnce({ id: "u1", email: "u@x.com" });
    generateCompletionMock.mockResolvedValueOnce(
      JSON.stringify({ suggestions: [], nextStep: "go" }),
    );
    const { POST } = await import("./arrangement/suggest/route");
    const res = await POST(jsonReq({ sessionState: { bpm: 120 } }));
    expect(res.status).not.toBe(401);
    expect(generateCompletionMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/audio/generate — auth gate", () => {
  it("does NOT call ElevenLabs when requireAuth throws", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { POST } = await import("./audio/generate/route");
    const res = await POST(jsonReq({ prompt: "lofi" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Authentication required");
    expect(generateMusicMock).not.toHaveBeenCalled();
  });

  it("calls ElevenLabs when auth succeeds", async () => {
    requireAuthMock.mockResolvedValueOnce({ id: "u1", email: "u@x.com" });
    generateMusicMock.mockResolvedValueOnce({
      audioBuffer: new Uint8Array([1, 2, 3]).buffer,
      contentType: "audio/mpeg",
    });
    const { POST } = await import("./audio/generate/route");
    const res = await POST(jsonReq({ prompt: "lofi" }));
    expect(res.status).not.toBe(401);
    expect(generateMusicMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/audio/upload — auth gate", () => {
  function formReq(): Request {
    const fd = new FormData();
    fd.append("audio", new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }), "c.webm");
    fd.append("sessionId", "sess-1");
    return new Request("http://localhost:3000/api/audio/upload", {
      method: "POST",
      body: fd,
    });
  }

  it("does NOT upload when requireAuth throws", async () => {
    const uploadSpy = vi.fn(async () => ({ error: null }));
    createClientMock.mockImplementationOnce(async () => ({
      storage: { from: vi.fn(() => ({ upload: uploadSpy })) },
    }));
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));

    const { POST } = await import("./audio/upload/route");
    const res = await POST(formReq() as never);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Authentication required");
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("uploads when auth succeeds", async () => {
    const uploadSpy = vi.fn(async () => ({ error: null }));
    createClientMock.mockImplementationOnce(async () => ({
      storage: { from: vi.fn(() => ({ upload: uploadSpy })) },
    }));
    requireAuthMock.mockResolvedValueOnce({ id: "u1", email: "u@x.com" });

    const { POST } = await import("./audio/upload/route");
    const res = await POST(formReq() as never);
    expect(res.status).not.toBe(401);
    expect(uploadSpy).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/capture/analyze — auth gate (returns 401)", () => {
  it("returns 401 and does NOT call Claude when requireAuth throws", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { POST } = await import("./capture/analyze/route");
    const res = await POST(jsonReq({ type: "text", textDescription: "hi" }) as never);
    expect(res.status).toBe(401);
    expect(generateCompletionMock).not.toHaveBeenCalled();
  });

  it("calls Claude when auth succeeds", async () => {
    requireAuthMock.mockResolvedValueOnce({ id: "u1", email: "u@x.com" });
    generateCompletionMock.mockResolvedValueOnce(JSON.stringify({ ok: true }));
    const { POST } = await import("./capture/analyze/route");
    const res = await POST(jsonReq({ type: "text", textDescription: "hi" }) as never);
    expect(res.status).not.toBe(401);
    expect(generateCompletionMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/chat — auth gate", () => {
  it("does NOT construct Claude client when requireAuth throws", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { POST } = await import("./chat/route");
    const res = await POST(
      jsonReq({ sessionId: "s1", message: "hi", history: [], context: {} }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Authentication required");
    expect(getClaudeClientMock).not.toHaveBeenCalled();
  });

  it("returns a streaming response when auth succeeds (non-401)", async () => {
    requireAuthMock.mockResolvedValueOnce({ id: "u1", email: "u@x.com" });
    // Provide a minimal Claude client mock so the stream setup proceeds.
    const fakeStream = (async function* () {
      // no events — consumer will still call finalMessage
    })();
    const iter = fakeStream as unknown as AsyncIterable<unknown> & {
      finalMessage: () => Promise<unknown>;
    };
    iter.finalMessage = async () => ({ content: [], stop_reason: "end_turn" });
    getClaudeClientMock.mockReturnValueOnce({
      messages: {
        stream: vi.fn(() => iter),
        create: vi.fn(async () => ({ content: [] })),
      },
    });

    const { POST } = await import("./chat/route");
    const res = await POST(
      jsonReq({ sessionId: "s1", message: "hi", history: [], context: {} }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(getClaudeClientMock).toHaveBeenCalledTimes(1);
    // Drain the stream so the test doesn't leak.
    const reader = res.body?.getReader();
    if (reader) {
      let done = false;
      while (!done) {
        const r = await reader.read();
        done = r.done;
      }
    }
  });
});
