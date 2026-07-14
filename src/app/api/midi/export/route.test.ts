import { describe, it, expect } from "vitest";
import type { Note, Track } from "@/lib/music/types";
import { POST } from "./route";

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "track-1",
    sessionId: "sess-1",
    name: "Piano",
    instrument: "piano",
    volume: 1,
    pan: 0,
    muted: false,
    solo: false,
    color: "#fff",
    sortOrder: 0,
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    trackId: "track-1",
    pitch: "C4",
    startTick: 0,
    durationTicks: 480,
    velocity: 100,
    ...overrides,
  };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/midi/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/midi/export", () => {
  it("returns 400 when no tracks are provided", async () => {
    const res = await POST(makeRequest({ tracks: [], notes: [] }) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No tracks provided" });
  });

  it("returns 400 when notes are empty after filtering to selected tracks", async () => {
    const res = await POST(
      makeRequest({ tracks: [makeTrack()], notes: [] }) as never,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No notes to export" });
  });

  it("returns 400 when notes exist but none belong to the selected tracks", async () => {
    const res = await POST(
      makeRequest({
        tracks: [makeTrack()],
        notes: [makeNote({ trackId: "other-track" })],
      }) as never,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No notes to export" });
  });

  it("exports a MIDI file (200) when tracks and notes are present", async () => {
    const res = await POST(
      makeRequest({
        tracks: [makeTrack()],
        notes: [makeNote()],
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/midi");
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});
