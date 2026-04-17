import type { Session } from "@/lib/music/types";

export type SortBy = "lastActiveAt" | "createdAt" | "title" | "bpm";
export type StatusFilter = "all" | "active" | "archived";

export interface FilterSortOptions {
  query: string;
  sortBy: SortBy;
  statusFilter: StatusFilter;
}

/**
 * Pure function: filter and sort sessions by query, sort field, and status.
 * Does not mutate the input array.
 */
export function filterAndSortSessions(
  sessions: Session[],
  { query, sortBy, statusFilter }: FilterSortOptions,
): Session[] {
  let result = sessions.slice(); // avoid mutation

  // Filter by status
  if (statusFilter !== "all") {
    result = result.filter((s) => s.status === statusFilter);
  }

  // Filter by search query
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.genre?.toLowerCase().includes(q) ||
        s.mood?.toLowerCase().includes(q) ||
        s.keySignature?.toLowerCase().includes(q),
    );
  }

  // Sort
  result.sort((a, b) => {
    switch (sortBy) {
      case "lastActiveAt":
        return b.lastActiveAt.localeCompare(a.lastActiveAt);
      case "createdAt":
        return b.createdAt.localeCompare(a.createdAt);
      case "title":
        return (a.title ?? "").localeCompare(b.title ?? "");
      case "bpm":
        return a.bpm - b.bpm;
      default:
        return 0;
    }
  });

  return result;
}
