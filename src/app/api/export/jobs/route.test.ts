import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { requireAuthMock, getSessionDBMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  getSessionDBMock: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/lib/supabase/db", () => ({
  getSession: getSessionDBMock,
}));

const JOB_ROW = {
  id: "job-1",
  session_id: "sess-1",
  format: "wav",
  bit_depth: null,
  stems_config: null,
  status: "pending",
  output_url: null,
  error_message: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function makeFakeClient(opts?: {
  insertResult?: { data: unknown; error: unknown };
  selectResult?: { data: unknown; error: unknown };
}) {
  const insertResult = opts?.insertResult ?? { data: JOB_ROW, error: null };
  const selectResult = opts?.selectResult ?? { data: [JOB_ROW], error: null };

  const single = vi.fn(async () => insertResult);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));

  const order = vi.fn(async () => selectResult);
  const eq = vi.fn(() => ({ order }));
  const selectList = vi.fn(() => ({ eq }));

  const from = vi.fn(() => ({
    insert,
    select: selectList,
  }));

  return { from, __insert: insert, __selectList: selectList };
}

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

const OWNER = { id: "user-1", email: "owner@example.com" };
const OWN_SESSION = { id: "sess-1", userId: "user-1", title: "My session" };

beforeEach(() => {
  requireAuthMock.mockReset();
  requireAuthMock.mockResolvedValue(OWNER);
  getSessionDBMock.mockReset();
  getSessionDBMock.mockResolvedValue(OWN_SESSION);
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(makeFakeClient());
});

afterEach(() => {
  vi.resetModules();
});

async function importRoute() {
  return await import("./route");
}

describe("POST /api/export/jobs", () => {
  it("creates an export job for the caller's own session (201)", async () => {
    const { POST } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "sess-1", format: "wav" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.job.sessionId).toBe("sess-1");
    expect(getSessionDBMock).toHaveBeenCalledWith(expect.anything(), "sess-1");
  });

  it("returns 403 when sessionId belongs to another user", async () => {
    getSessionDBMock.mockResolvedValueOnce({ id: "sess-2", userId: "other-user" });

    const { POST } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "sess-2", format: "wav" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 when sessionId does not exist", async () => {
    getSessionDBMock.mockResolvedValueOnce(null);

    const { POST } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "missing", format: "wav" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("does not insert an export job row when ownership check fails", async () => {
    getSessionDBMock.mockResolvedValueOnce({ id: "sess-2", userId: "other-user" });
    const fakeClient = makeFakeClient();
    createClientMock.mockResolvedValueOnce(fakeClient);

    const { POST } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "sess-2", format: "wav" }),
    });

    await POST(req);

    expect(fakeClient.__insert).not.toHaveBeenCalled();
  });

  it("returns 401 when requireAuth throws", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));

    const { POST } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "sess-1", format: "wav" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(getSessionDBMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/export/jobs", () => {
  it("returns jobs for the caller's own session", async () => {
    const { GET } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs?sessionId=sess-1");

    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jobs).toHaveLength(1);
    expect(json.jobs[0].sessionId).toBe("sess-1");
    expect(getSessionDBMock).toHaveBeenCalledWith(expect.anything(), "sess-1");
  });

  it("returns 403 for another user's session", async () => {
    getSessionDBMock.mockResolvedValueOnce({ id: "sess-2", userId: "other-user" });

    const { GET } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs?sessionId=sess-2");

    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 404 when sessionId does not exist", async () => {
    getSessionDBMock.mockResolvedValueOnce(null);

    const { GET } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs?sessionId=missing");

    const res = await GET(req);

    expect(res.status).toBe(404);
  });

  it("does not query export_jobs when ownership check fails", async () => {
    getSessionDBMock.mockResolvedValueOnce({ id: "sess-2", userId: "other-user" });
    const fakeClient = makeFakeClient();
    createClientMock.mockResolvedValueOnce(fakeClient);

    const { GET } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs?sessionId=sess-2");

    await GET(req);

    expect(fakeClient.__selectList).not.toHaveBeenCalled();
  });

  it("returns 401 when requireAuth throws", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required"));

    const { GET } = await importRoute();
    const req = new Request("http://localhost:3000/api/export/jobs?sessionId=sess-1");

    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(getSessionDBMock).not.toHaveBeenCalled();
  });
});
