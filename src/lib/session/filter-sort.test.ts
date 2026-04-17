import { describe, it, expect } from "vitest";
import { filterAndSortSessions } from "./filter-sort";
import type { Session } from "@/lib/music/types";

function makeSession(overrides: Partial<Session> & { id: string }): Session {
  return {
    userId: "user-1",
    title: "Untitled",
    status: "active",
    bpm: 120,
    keySignature: "C",
    timeSignature: "4/4",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastActiveAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const sessions: Session[] = [
  makeSession({
    id: "1",
    title: "Summer Vibes",
    genre: "Pop",
    mood: "happy",
    bpm: 128,
    status: "active",
    lastActiveAt: "2024-03-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
  }),
  makeSession({
    id: "2",
    title: "Dark Trap Beat",
    genre: "Trap",
    mood: "dark",
    bpm: 140,
    status: "archived",
    lastActiveAt: "2024-02-01T00:00:00Z",
    createdAt: "2024-01-15T00:00:00Z",
  }),
  makeSession({
    id: "3",
    title: "Chill Lo-fi",
    genre: "Lo-fi",
    mood: "relaxed",
    bpm: 85,
    status: "active",
    lastActiveAt: "2024-04-01T00:00:00Z",
    createdAt: "2024-02-01T00:00:00Z",
  }),
  makeSession({
    id: "4",
    title: "Jazz Fusion",
    genre: "Jazz",
    mood: "smooth",
    bpm: 100,
    status: "paused",
    lastActiveAt: "2024-01-15T00:00:00Z",
    createdAt: "2024-01-10T00:00:00Z",
    keySignature: "F#",
  }),
];

describe("filterAndSortSessions", () => {
  it("returns empty array for empty input", () => {
    const result = filterAndSortSessions([], { query: "", sortBy: "lastActiveAt", statusFilter: "all" });
    expect(result).toEqual([]);
  });

  it("returns all sessions when no filters applied", () => {
    const result = filterAndSortSessions(sessions, { query: "", sortBy: "lastActiveAt", statusFilter: "all" });
    expect(result).toHaveLength(4);
  });

  it("searches by title (case-insensitive)", () => {
    const result = filterAndSortSessions(sessions, { query: "chill", sortBy: "lastActiveAt", statusFilter: "all" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("searches by genre", () => {
    const result = filterAndSortSessions(sessions, { query: "trap", sortBy: "lastActiveAt", statusFilter: "all" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("searches by mood", () => {
    const result = filterAndSortSessions(sessions, { query: "relaxed", sortBy: "lastActiveAt", statusFilter: "all" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("searches by key signature", () => {
    const result = filterAndSortSessions(sessions, { query: "F#", sortBy: "lastActiveAt", statusFilter: "all" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("sorts by BPM ascending", () => {
    const result = filterAndSortSessions(sessions, { query: "", sortBy: "bpm", statusFilter: "all" });
    const bpms = result.map((s) => s.bpm);
    expect(bpms).toEqual([...bpms].sort((a, b) => a - b));
  });

  it("sorts by lastActiveAt descending (most recent first)", () => {
    const result = filterAndSortSessions(sessions, { query: "", sortBy: "lastActiveAt", statusFilter: "all" });
    const dates = result.map((s) => s.lastActiveAt);
    expect(dates[0]).toBe("2024-04-01T00:00:00Z");
    expect(dates[dates.length - 1]).toBe("2024-01-15T00:00:00Z");
  });

  it("sorts by createdAt descending", () => {
    const result = filterAndSortSessions(sessions, { query: "", sortBy: "createdAt", statusFilter: "all" });
    const dates = result.map((s) => s.createdAt);
    expect(dates[0]).toBe("2024-02-01T00:00:00Z");
    expect(dates[dates.length - 1]).toBe("2024-01-01T00:00:00Z");
  });

  it("sorts by title ascending (alphabetical)", () => {
    const result = filterAndSortSessions(sessions, { query: "", sortBy: "title", statusFilter: "all" });
    const titles = result.map((s) => s.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it("filters active sessions only", () => {
    const result = filterAndSortSessions(sessions, { query: "", sortBy: "lastActiveAt", statusFilter: "active" });
    expect(result.every((s) => s.status === "active")).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("filters archived sessions only", () => {
    const result = filterAndSortSessions(sessions, { query: "", sortBy: "lastActiveAt", statusFilter: "archived" });
    expect(result.every((s) => s.status === "archived")).toBe(true);
    expect(result).toHaveLength(1);
  });

  it("combines query + sort + filter", () => {
    // query="o" matches Pop, Lo-fi, Trap, Jazz but status filter active only keeps active ones
    const result = filterAndSortSessions(sessions, { query: "o", sortBy: "bpm", statusFilter: "active" });
    // active sessions with "o" somewhere: "Summer Vibes" (Pop, happy), "Chill Lo-fi" (Lo-fi, relaxed)
    expect(result.every((s) => s.status === "active")).toBe(true);
    // should be sorted by BPM ascending
    const bpms = result.map((s) => s.bpm);
    expect(bpms).toEqual([...bpms].sort((a, b) => a - b));
  });

  it("does not mutate the input array", () => {
    const input = [...sessions];
    filterAndSortSessions(input, { query: "", sortBy: "bpm", statusFilter: "all" });
    expect(input).toEqual(sessions);
  });
});
