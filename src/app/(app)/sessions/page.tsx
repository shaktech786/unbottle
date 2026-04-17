"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { SessionList } from "@/components/session/session-list";
import { useSession } from "@/lib/hooks/use-session";
import { filterAndSortSessions, type SortBy, type StatusFilter } from "@/lib/session/filter-sort";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "lastActiveAt", label: "Last active" },
  { value: "createdAt", label: "Date created" },
  { value: "title", label: "Title (A–Z)" },
  { value: "bpm", label: "BPM" },
];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export default function SessionsPage() {
  const { sessions, isLoading, error, listSessions, updateSession, deleteSession } =
    useSession();

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("lastActiveAt");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    listSessions();
  }, [listSessions]);

  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      await updateSession(id, { title: newTitle } as Partial<import("@/lib/music/types").Session>);
      await listSessions();
    },
    [updateSession, listSessions],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteSession(id);
    },
    [deleteSession],
  );

  const visibleSessions = useMemo(
    () => filterAndSortSessions(sessions, { query, sortBy, statusFilter }),
    [sessions, query, sortBy, statusFilter],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="My Sessions" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search title, genre, mood, key..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800/50 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-10 rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 text-sm text-neutral-200 focus:border-amber-500/50 focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status tabs */}
        <div className="mb-6 flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={[
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors duration-200",
                statusFilter === tab.value
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && !isLoading && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-sm font-medium text-red-400">
              Couldn&apos;t load your sessions.
            </p>
            <button
              onClick={() => listSessions()}
              className="mt-3 inline-flex items-center rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
            >
              Try refreshing
            </button>
          </div>
        )}

        {!error && (
          <SessionList
            sessions={visibleSessions}
            isLoading={isLoading}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
