"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { AuditEntry } from "@/lib/daw/audit-log";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statusDot(success: boolean) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        success ? "bg-emerald-500" : "bg-red-500",
      )}
      aria-label={success ? "success" : "error"}
    />
  );
}

function paramsPreview(params: Record<string, unknown>): string {
  const keys = Object.keys(params);
  if (keys.length === 0) return "—";
  return keys
    .map((k) => {
      const v = params[k];
      if (typeof v === "string") return `${k}="${v}"`;
      return `${k}=${JSON.stringify(v)}`;
    })
    .join(", ");
}

// ---------------------------------------------------------------------------
// Entry row
// ---------------------------------------------------------------------------

function EntryRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="border-b border-neutral-800/40 last:border-0">
      <button
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-neutral-800/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="mt-1">{statusDot(entry.result.success)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-xs font-semibold text-neutral-200">
              {entry.toolName}
            </span>
            <span className="shrink-0 text-xs text-neutral-500">
              {formatTime(entry.timestamp)}
            </span>
          </div>
          <p className="truncate text-xs text-neutral-500 mt-0.5">
            {paramsPreview(entry.params)}
          </p>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "mt-1 shrink-0 text-neutral-500 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 font-mono text-xs text-neutral-400 space-y-1">
          <div>
            <span className="text-neutral-500">params: </span>
            <span>{JSON.stringify(entry.params, null, 2)}</span>
          </div>
          {entry.result.error && (
            <div>
              <span className="text-red-400">error: </span>
              <span className="text-red-300">{entry.result.error}</span>
            </div>
          )}
          {entry.result.state_delta && (
            <div>
              <span className="text-neutral-500">delta: </span>
              <span className="text-neutral-300">
                {JSON.stringify(entry.result.state_delta)}
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export interface AIActionsPanelProps {
  /** Audit log entries to display. Pass the result of getAuditLog(). */
  entries: readonly AuditEntry[];
  /** Default open state. Defaults to true. */
  defaultOpen?: boolean;
  className?: string;
}

export function AIActionsPanel({
  entries,
  defaultOpen = true,
  className,
}: AIActionsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const listRef = useRef<HTMLUListElement>(null);

  // Auto-scroll to the latest entry whenever entries change
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries.length, open]);

  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border border-neutral-800/60 bg-[#0d0d0d] text-sm",
        className,
      )}
      aria-label="AI Actions log"
    >
      {/* Header */}
      <button
        className="flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-neutral-800/20 transition-colors rounded-t-lg"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-500"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-semibold text-neutral-200 text-xs uppercase tracking-wider">
            AI Actions
          </span>
          {entries.length > 0 && (
            <span className="rounded-full bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-300">
              {entries.length}
            </span>
          )}
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "text-neutral-500 transition-transform",
            !open && "-rotate-90",
          )}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Body */}
      {open && (
        <ul
          ref={listRef}
          className="max-h-72 overflow-y-auto divide-y divide-neutral-800/30"
          aria-live="polite"
          aria-label="AI action entries"
        >
          {entries.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-neutral-500">
              No AI actions yet
            </li>
          ) : (
            entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)
          )}
        </ul>
      )}
    </section>
  );
}
