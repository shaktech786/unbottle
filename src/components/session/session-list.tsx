"use client";

import type { Session } from "@/lib/music/types";
import { SessionCard } from "./session-card";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionListProps {
  sessions: Session[];
  isLoading: boolean;
  onRename?: (id: string, newTitle: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function SessionList({ sessions, isLoading, onRename, onDelete }: SessionListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
          >
            <Skeleton className="h-5 w-3/4" />
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 py-16">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-700"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <p className="mt-4 text-lg font-medium text-neutral-400">
          The studio is empty
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Time to change that.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
