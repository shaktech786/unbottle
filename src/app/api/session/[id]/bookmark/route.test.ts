import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  createClientMock,
  requireAuthMock,
  getSessionDBMock,
  addBookmarkDBMock,
  updateBookmarkDBMock,
  deleteBookmarkDBMock,
  getSessionMemoryMock,
  addBookmarkMemoryMock,
  updateBookmarkMemoryMock,
  deleteBookmarkMemoryMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(async () => ({ __fake: "client" })),
  requireAuthMock: vi.fn(async () => ({ id: "user-1", email: "u@example.com" })),
  getSessionDBMock: vi.fn(),
  addBookmarkDBMock: vi.fn(),
  updateBookmarkDBMock: vi.fn(),
  deleteBookmarkDBMock: vi.fn(),
  getSessionMemoryMock: vi.fn(),
  addBookmarkMemoryMock: vi.fn(),
  updateBookmarkMemoryMock: vi.fn(),
  deleteBookmarkMemoryMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/supabase/auth", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/supabase/db", () => ({
  getSession: getSessionDBMock,
  getBookmarks: vi.fn(async () => []),
  addBookmark: addBookmarkDBMock,
  updateBookmark: updateBookmarkDBMock,
  deleteBookmark: deleteBookmarkDBMock,
}));

vi.mock("@/lib/session/store", () => ({
  getSession: getSessionMemoryMock,
  getBookmarks: vi.fn(() => []),
  addBookmark: addBookmarkMemoryMock,
  updateBookmark: updateBookmarkMemoryMock,
  deleteBookmark: deleteBookmarkMemoryMock,
}));

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/session/abc/bookmark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const SUPABASE_URL = "https://test.supabase.co";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  requireAuthMock.mockReset();
  requireAuthMock.mockResolvedValue({ id: "user-1", email: "u@example.com" });
  getSessionDBMock.mockReset();
  getSessionDBMock.mockResolvedValue({ id: "abc", userId: "user-1", title: "Test" });
  addBookmarkDBMock.mockReset();
  updateBookmarkDBMock.mockReset();
  deleteBookmarkDBMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function importRoute() {
  return await import("./route");
}

describe("POST /api/session/[id]/bookmark", () => {
  it("creates a bookmark with valid payload (201)", async () => {
    const created = {
      id: "bm-1",
      sessionId: "abc",
      label: "Cool idea",
      createdAt: "now",
    };
    addBookmarkDBMock.mockResolvedValueOnce(created);
    const { POST } = await importRoute();

    const res = await POST(
      makeRequest({ label: "Cool idea", description: "desc" }) as never,
      paramsFor("abc"),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ bookmark: created });
    expect(requireAuthMock).toHaveBeenCalledTimes(1);
    expect(addBookmarkDBMock).toHaveBeenCalledWith(
      expect.anything(),
      "abc",
      expect.objectContaining({ label: "Cool idea", description: "desc" }),
    );
  });

  it("returns 400 when label is missing", async () => {
    const { POST } = await importRoute();
    const res = await POST(makeRequest({}) as never, paramsFor("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "label is required and must be a non-empty string",
    });
    expect(addBookmarkDBMock).not.toHaveBeenCalled();
  });

  it("returns 400 when label is empty/whitespace", async () => {
    const { POST } = await importRoute();
    const res = await POST(makeRequest({ label: "   " }) as never, paramsFor("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 on malformed JSON", async () => {
    const { POST } = await importRoute();
    const res = await POST(makeRequest("not-json{") as never, paramsFor("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 401 when requireAuth throws (unauthenticated)", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { POST } = await importRoute();

    const res = await POST(
      makeRequest({ label: "x" }) as never,
      paramsFor("abc"),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Authentication required" });
    expect(addBookmarkDBMock).not.toHaveBeenCalled();
  });

  it("returns 404 when session not found (authorization boundary)", async () => {
    getSessionDBMock.mockResolvedValueOnce(null);
    const { POST } = await importRoute();

    const res = await POST(
      makeRequest({ label: "x" }) as never,
      paramsFor("missing"),
    );

    expect(res.status).toBe(404);
    expect(addBookmarkDBMock).not.toHaveBeenCalled();
  });

  it("returns 500 when DB throws", async () => {
    addBookmarkDBMock.mockRejectedValueOnce(new Error("db down"));
    const { POST } = await importRoute();

    const res = await POST(
      makeRequest({ label: "x" }) as never,
      paramsFor("abc"),
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "db down" });
  });
});

describe("PATCH /api/session/[id]/bookmark", () => {
  it("updates bookmark with valid payload", async () => {
    const updated = { id: "bm-1", sessionId: "abc", label: "Renamed" };
    updateBookmarkDBMock.mockResolvedValueOnce(updated);
    const { PATCH } = await importRoute();

    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarkId: "bm-1", label: "Renamed" }),
    });
    const res = await PATCH(req as never, paramsFor("abc"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ bookmark: updated });
    expect(updateBookmarkDBMock).toHaveBeenCalledWith(
      expect.anything(),
      "bm-1",
      expect.objectContaining({ label: "Renamed" }),
    );
  });

  it("returns 400 when bookmarkId is missing", async () => {
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "x" }),
    });
    const res = await PATCH(req as never, paramsFor("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bookmarkId is required" });
  });

  it("returns 400 when no valid updates provided", async () => {
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarkId: "bm-1" }),
    });
    const res = await PATCH(req as never, paramsFor("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No valid fields to update" });
  });

  it("returns 400 on malformed JSON", async () => {
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json{",
    });
    const res = await PATCH(req as never, paramsFor("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 401 when requireAuth throws", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarkId: "bm-1", label: "x" }),
    });
    const res = await PATCH(req as never, paramsFor("abc"));
    expect(res.status).toBe(401);
    expect(updateBookmarkDBMock).not.toHaveBeenCalled();
  });

  it("returns 500 when DB throws", async () => {
    updateBookmarkDBMock.mockRejectedValueOnce(new Error("db fail"));
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarkId: "bm-1", label: "x" }),
    });
    const res = await PATCH(req as never, paramsFor("abc"));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/session/[id]/bookmark", () => {
  it("deletes a bookmark with valid payload", async () => {
    deleteBookmarkDBMock.mockResolvedValueOnce(undefined);
    const { DELETE } = await importRoute();

    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarkId: "bm-1" }),
    });
    const res = await DELETE(req as never, paramsFor("abc"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(deleteBookmarkDBMock).toHaveBeenCalledWith(expect.anything(), "bm-1");
  });

  it("returns 400 when bookmarkId is missing", async () => {
    const { DELETE } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await DELETE(req as never, paramsFor("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 on malformed JSON", async () => {
    const { DELETE } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: "not-json{",
    });
    const res = await DELETE(req as never, paramsFor("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 401 when requireAuth throws", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { DELETE } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarkId: "bm-1" }),
    });
    const res = await DELETE(req as never, paramsFor("abc"));
    expect(res.status).toBe(401);
    expect(deleteBookmarkDBMock).not.toHaveBeenCalled();
  });

  it("returns 500 when DB throws", async () => {
    deleteBookmarkDBMock.mockRejectedValueOnce(new Error("db fail"));
    const { DELETE } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarkId: "bm-1" }),
    });
    const res = await DELETE(req as never, paramsFor("abc"));
    expect(res.status).toBe(500);
  });
});

describe("authorization — user can only mutate own session's bookmarks (via RLS + requireAuth)", () => {
  it("POST: requireAuth() is invoked BEFORE any DB mutation", async () => {
    const order: string[] = [];
    requireAuthMock.mockImplementationOnce(async () => {
      order.push("auth");
      return { id: "user-1", email: "u@example.com" };
    });
    getSessionDBMock.mockImplementationOnce(async () => {
      order.push("getSession");
      return { id: "abc", userId: "user-1" };
    });
    addBookmarkDBMock.mockImplementationOnce(async () => {
      order.push("add");
      return { id: "bm-1" };
    });

    const { POST } = await importRoute();
    await POST(makeRequest({ label: "x" }) as never, paramsFor("abc"));

    expect(order).toEqual(["auth", "getSession", "add"]);
  });

  it("PATCH: if requireAuth fails, no DB mutation is attempted", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost:3000/api/session/abc/bookmark", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookmarkId: "bm-1", label: "x" }),
    });
    await PATCH(req as never, paramsFor("abc"));
    expect(updateBookmarkDBMock).not.toHaveBeenCalled();
  });
});
