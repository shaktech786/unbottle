// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SessionList } from "./session-list";
import { filterAndSortSessions } from "@/lib/session/filter-sort";
import type { Session } from "@/lib/music/types";

afterEach(() => {
  cleanup();
  localStorage.clear();
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

const LAST_SESSION_COUNT_KEY = "unbottle:last-session-count";

function skeletonCardCount(container: HTMLElement): number {
  // Each skeleton card renders 4 Skeleton elements (title, 2 tags, date)
  return container.querySelectorAll(".animate-pulse").length / 4;
}

describe("SessionList", () => {
  it("shows skeleton placeholders while loading", () => {
    const { container } = render(
      <SessionList sessions={[]} isLoading={true} />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("defaults to 3 skeleton cards on first-ever load with no cached count", () => {
    const { container } = render(
      <SessionList sessions={[]} isLoading={true} />,
    );
    expect(skeletonCardCount(container)).toBe(3);
  });

  it("uses the cached session count to size the skeleton grid", () => {
    localStorage.setItem(LAST_SESSION_COUNT_KEY, "2");
    const { container } = render(
      <SessionList sessions={[]} isLoading={true} />,
    );
    expect(skeletonCardCount(container)).toBe(2);
  });

  it("clamps the cached count to a max of 6 skeleton cards", () => {
    localStorage.setItem(LAST_SESSION_COUNT_KEY, "20");
    const { container } = render(
      <SessionList sessions={[]} isLoading={true} />,
    );
    expect(skeletonCardCount(container)).toBe(6);
  });

  it("clamps the cached count to a min of 1 skeleton card", () => {
    localStorage.setItem(LAST_SESSION_COUNT_KEY, "0");
    const { container } = render(
      <SessionList sessions={[]} isLoading={true} />,
    );
    expect(skeletonCardCount(container)).toBe(1);
  });

  it("caches the session count once sessions load, for use on the next loading render", () => {
    const sessions = [
      makeSession({ id: "a", title: "Alpha" }),
      makeSession({ id: "b", title: "Beta" }),
    ];
    render(<SessionList sessions={sessions} isLoading={false} />);

    expect(localStorage.getItem(LAST_SESSION_COUNT_KEY)).toBe("2");
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
