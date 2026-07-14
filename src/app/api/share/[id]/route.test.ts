import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  createClientMock,
  getSessionBySlugMock,
  getLatestAudioCaptureMock,
  createSignedUrlMock,
  getSessionMemoryMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getSessionBySlugMock: vi.fn(),
  getLatestAudioCaptureMock: vi.fn(),
  createSignedUrlMock: vi.fn(),
  getSessionMemoryMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/supabase/db", () => ({
  getSessionBySlug: getSessionBySlugMock,
  getLatestAudioCapture: getLatestAudioCaptureMock,
}));

vi.mock("@/lib/session/store", () => ({
  getSession: getSessionMemoryMock,
}));

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const SUPABASE_URL = "https://test.supabase.co";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  createClientMock.mockReset();
  createClientMock.mockResolvedValue({
    storage: {
      from: () => ({ createSignedUrl: createSignedUrlMock }),
    },
  });
  getSessionBySlugMock.mockReset();
  getLatestAudioCaptureMock.mockReset();
  getLatestAudioCaptureMock.mockResolvedValue(null);
  createSignedUrlMock.mockReset();
  getSessionMemoryMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function importRoute() {
  return await import("./route");
}

describe("GET /api/share/[id] (IDOR fix — slug + is_public gated)", () => {
  it("returns 404 for a session that exists but is not public", async () => {
    getSessionBySlugMock.mockResolvedValueOnce({
      id: "sess-1",
      userId: "user-1",
      title: "Private Jam",
      isPublic: false,
    });
    const { GET } = await importRoute();

    const res = await GET(new Request("http://localhost/api/share/some-slug") as never, paramsFor("some-slug"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
    expect(getLatestAudioCaptureMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a nonexistent slug", async () => {
    getSessionBySlugMock.mockResolvedValueOnce(null);
    const { GET } = await importRoute();

    const res = await GET(new Request("http://localhost/api/share/missing") as never, paramsFor("missing"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns session metadata + signed audio URL for a public session", async () => {
    getSessionBySlugMock.mockResolvedValueOnce({
      id: "sess-1",
      userId: "user-1",
      title: "Public Jam",
      genre: "Hip-Hop",
      mood: "Chill",
      bpm: 92,
      keySignature: "C major",
      isPublic: true,
    });
    getLatestAudioCaptureMock.mockResolvedValueOnce({
      audioUrl: "/api/audio/capture-1",
    });
    createSignedUrlMock.mockResolvedValueOnce({
      data: { signedUrl: "https://signed.example.com/capture-1.webm" },
    });
    const { GET } = await importRoute();

    const res = await GET(new Request("http://localhost/api/share/public-slug") as never, paramsFor("public-slug"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "sess-1",
      title: "Public Jam",
      genre: "Hip-Hop",
      mood: "Chill",
      bpm: 92,
      keySignature: "C major",
      audioUrl: "https://signed.example.com/capture-1.webm",
    });
    expect(getSessionBySlugMock).toHaveBeenCalledWith(expect.anything(), "public-slug");
  });

  it("looks up by slug, not by raw session id", async () => {
    getSessionBySlugMock.mockResolvedValueOnce(null);
    const { GET } = await importRoute();

    await GET(new Request("http://localhost/api/share/abc-123") as never, paramsFor("abc-123"));

    expect(getSessionBySlugMock).toHaveBeenCalledWith(expect.anything(), "abc-123");
  });
});
