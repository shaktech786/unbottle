"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { Session } from "@/lib/music/types";

interface SessionCardProps {
  session: Session;
  onRename?: (id: string, newTitle: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
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

export function SessionCard({ session, onRename, onDelete }: SessionCardProps) {
  const accent = getAccentColor(session.genre);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  async function handleSaveTitle() {
    const trimmed = editValue.trim();
    setIsEditing(false);
    if (!trimmed || trimmed === session.title) {
      setEditValue(session.title);
      return;
    }
    if (onRename) {
      await onRename(session.id, trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    }
    if (e.key === "Escape") {
      setEditValue(session.title);
      setIsEditing(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(session.id);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEditClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(session.title);
    setIsEditing(true);
  }

  // When editing, render without the Link wrapper to avoid navigation
  if (isEditing) {
    return (
      <div className="group relative flex flex-col overflow-hidden rounded-xl border border-amber-500/50 bg-neutral-900 p-4 shadow-lg shadow-amber-500/5">
        {/* Left accent bar */}
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: accent }}
        />

        {/* Header - editing */}
        <div className="flex items-start justify-between gap-2 pl-2">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-sm font-semibold text-neutral-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
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
      </div>
    );
  }

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
      <div className="flex items-start justify-between gap-2 pl-2">
        <h3 className="flex-1 text-sm font-semibold text-neutral-100 transition-colors duration-300 group-hover:text-amber-400">
          {session.title}
        </h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Edit button - visible on hover */}
          {onRename && (
            <button
              onClick={handleEditClick}
              className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 opacity-0 transition-all duration-200 hover:bg-neutral-800 hover:text-neutral-300 group-hover:opacity-100"
              title="Rename session"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          )}
          {/* Delete button - visible on hover */}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 opacity-0 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
              title="Archive session"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
          <span
            className={cn(
              "mt-0.5 h-2 w-2 shrink-0 rounded-full",
              statusColors[session.status],
            )}
            title={session.status}
          />
        </div>
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
