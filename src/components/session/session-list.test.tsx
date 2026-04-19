// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SessionList } from "./session-list";
import { filterAndSortSessions } from "@/lib/session/filter-sort";
import type { Session } from "@/lib/music/types";

afterEach(() => {
  cleanup();
});

function makeSession(overrides: Partial<Session> = {}): Session {
  const now = new Date().toISOString();
  return {
    id: "sess-1",
    userId: "user-1",
    title: "Midnight Jam",
    status: "active",
    bpm: 92,
    keySignature: "C major",
    timeSignature: "4/4",
    genre: "Hip-Hop",
    mood: "Chill",
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    ...overrides,
  };
}

describe("SessionList", () => {
  it("shows skeleton placeholders while loading", () => {
    const { container } = render(
      <SessionList sessions={[]} isLoading={true} />,
    );
    // 6 skeleton cards in the loading state
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("shows the empty state when there are no sessions", () => {
    render(<SessionList sessions={[]} isLoading={false} />);
    expect(screen.getByText("The studio is empty")).toBeInTheDocument();
  });

  it("renders one card per session", () => {
    const sessions = [
      makeSession({ id: "a", title: "Alpha" }),
      makeSession({ id: "b", title: "Beta" }),
      makeSession({ id: "c", title: "Gamma" }),
    ];

    render(<SessionList sessions={sessions} isLoading={false} />);

    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gamma" })).toBeInTheDocument();
  });

  it("filters visible items when the search query is applied via filterAndSortSessions", () => {
    const all = [
      makeSession({ id: "a", title: "Alpha", genre: "Hip-Hop" }),
      makeSession({ id: "b", title: "Beta", genre: "Jazz" }),
      makeSession({ id: "c", title: "Alphabetical", genre: "Pop" }),
    ];
    const visible = filterAndSortSessions(all, {
      query: "alpha",
      sortBy: "title",
      statusFilter: "all",
    });

    render(<SessionList sessions={visible} isLoading={false} />);

    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Alphabetical" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Beta" })).not.toBeInTheDocument();
  });

  it("reorders items when the sort option changes", () => {
    const all = [
      makeSession({ id: "a", title: "Charlie", bpm: 140 }),
      makeSession({ id: "b", title: "Alpha", bpm: 80 }),
      makeSession({ id: "c", title: "Bravo", bpm: 100 }),
    ];

    const byTitle = filterAndSortSessions(all, {
      query: "",
      sortBy: "title",
      statusFilter: "all",
    });
    const { rerender, container } = render(
      <SessionList sessions={byTitle} isLoading={false} />,
    );

    const titles = () =>
      Array.from(container.querySelectorAll("h3")).map((n) => n.textContent);

    expect(titles()).toEqual(["Alpha", "Bravo", "Charlie"]);

    const byBpm = filterAndSortSessions(all, {
      query: "",
      sortBy: "bpm",
      statusFilter: "all",
    });
    rerender(<SessionList sessions={byBpm} isLoading={false} />);

    expect(titles()).toEqual(["Alpha", "Bravo", "Charlie"]); // bpm 80, 100, 140 -> same order here
    // Flip with a bpm-descending-ish check by using a differentiating dataset
    const all2 = [
      makeSession({ id: "a", title: "Charlie", bpm: 80 }),
      makeSession({ id: "b", title: "Alpha", bpm: 140 }),
    ];
    rerender(
      <SessionList
        sessions={filterAndSortSessions(all2, {
          query: "",
          sortBy: "bpm",
          statusFilter: "all",
        })}
        isLoading={false}
      />,
    );
    expect(titles()).toEqual(["Charlie", "Alpha"]);
  });

  it("shows the empty state when filtering excludes every session", () => {
    const all = [makeSession({ title: "Alpha", status: "active" })];
    const visible = filterAndSortSessions(all, {
      query: "nonexistent",
      sortBy: "title",
      statusFilter: "all",
    });

    render(<SessionList sessions={visible} isLoading={false} />);
    expect(screen.getByText("The studio is empty")).toBeInTheDocument();
  });
});
