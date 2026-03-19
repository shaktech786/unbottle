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
  archived: "bg-slate-500",
};

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link
      href={`/session/${session.id}`}
      className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
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
      <div className="mt-3 flex flex-wrap gap-1.5">
        {session.genre && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            {session.genre}
          </span>
        )}
        {session.mood && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            {session.mood}
          </span>
        )}
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
          {session.bpm} BPM
        </span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
          {session.keySignature}
        </span>
      </div>

      {/* Footer */}
      <p className="mt-3 text-xs text-slate-500">
        {formatRelativeTime(session.lastActiveAt)}
      </p>
    </Link>
  );
}
