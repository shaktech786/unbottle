"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { Session } from "@/lib/music/types";

interface SessionCardProps {
  session: Session;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const statusColors: Record<Session["status"], string> = {
  active: "bg-emerald-500",
  paused: "bg-amber-500",
  completed: "bg-blue-500",
  archived: "bg-neutral-500",
};

/** Genre-based accent color for the left bar */
const genreAccentColors: Record<string, string> = {
  "Hip-Hop": "#f59e0b",
  Pop: "#ec4899",
  "R&B": "#a855f7",
  Electronic: "#06b6d4",
  Rock: "#ef4444",
  Jazz: "#f97316",
  "Lo-fi": "#8b5cf6",
  Ambient: "#14b8a6",
  Funk: "#eab308",
  Soul: "#d946ef",
  Classical: "#6366f1",
  Trap: "#f43f5e",
};

function getAccentColor(genre?: string | null): string {
  if (!genre) return "#f59e0b"; // default amber
  return genreAccentColors[genre] ?? "#f59e0b";
}

export function SessionCard({ session }: SessionCardProps) {
  const accent = getAccentColor(session.genre);

  return (
    <Link
      href={`/session/${session.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all duration-300 hover:border-neutral-700 hover:bg-neutral-900 hover:shadow-lg hover:shadow-amber-500/5"
    >
      {/* Left accent bar */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accent }}
      />

      {/* Header */}
      <div className="flex items-start justify-between pl-2">
        <h3 className="text-sm font-semibold text-neutral-100 transition-colors duration-300 group-hover:text-amber-400">
          {session.title}
        </h3>
        <span
          className={cn(
            "mt-0.5 h-2 w-2 shrink-0 rounded-full",
            statusColors[session.status],
          )}
          title={session.status}
        />
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5 pl-2">
        {session.genre && (
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
            {session.genre}
          </span>
        )}
        {session.mood && (
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
            {session.mood}
          </span>
        )}
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-400">
          {session.bpm} BPM
        </span>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-400">
          {session.keySignature}
        </span>
      </div>

      {/* Footer */}
      <p className="mt-3 pl-2 text-xs text-neutral-500">
        {formatRelativeTime(session.lastActiveAt)}
      </p>
    </Link>
  );
}
