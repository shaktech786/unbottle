"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { SessionList } from "@/components/session/session-list";
import { SessionCard } from "@/components/session/session-card";
import { useSession } from "@/lib/hooks/use-session";
import { buildSessionTree, type SessionTreeNode } from "@/lib/session/branch-tree";

export default function DashboardPage() {
  const router = useRouter();
  const { sessions, isLoading, error, listSessions, createSession, updateSession, deleteSession } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [branchView, setBranchView] = useState(false);

  useEffect(() => {
    listSessions();
  }, [listSessions]);

  async function handleNewSession() {
    await createSession();
  }

  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      await updateSession(id, { title: newTitle } as Partial<import("@/lib/music/types").Session>);
      // Refresh list to reflect the change
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

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.genre?.toLowerCase().includes(q) ||
        s.mood?.toLowerCase().includes(q) ||
        s.keySignature?.toLowerCase().includes(q),
    );
  }, [sessions, searchQuery]);

  const hasForks = useMemo(
    () => sessions.some((s) => s.parentBranchId),
    [sessions],
  );

  const sessionTree = useMemo(
    () => buildSessionTree(filteredSessions),
    [filteredSessions],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Welcome + action */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-100 sm:text-2xl">
              What are you working on?
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Pick up where you left off, or start something new.
            </p>
          </div>
          <Button size="lg" onClick={handleNewSession} className="w-full min-h-[44px] sm:w-auto">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Start New Session
          </Button>
        </div>

        {/* Quick start card — always visible as the primary low-friction entry point */}
        {!isLoading && (
          <button
            onClick={handleNewSession}
            className="group mb-8 flex w-full items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-left transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-lg hover:shadow-amber-500/5 sm:gap-6 sm:p-8"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 transition-colors duration-300 group-hover:bg-amber-500/30">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-amber-400"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-300">
                Just Start
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                Jump in with defaults (120 BPM, key of C). You can change
                everything later.
              </p>
            </div>
          </button>
        )}

        {/* Or go to the session creation page */}
        {!isLoading && (
          <div className="mb-8 text-center">
            <button
              onClick={() => router.push("/session/new")}
              className="text-sm text-neutral-400 underline underline-offset-4 transition-colors duration-300 hover:text-neutral-200"
            >
              Or configure a session first
            </button>
          </div>
        )}

        {/* Error loading sessions */}
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

        {/* Recent sessions */}
        {!error && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
                Recent Sessions
              </h3>
              <div className="flex items-center gap-2">
                {hasForks && (
                  <button
                    onClick={() => setBranchView((v) => !v)}
                    className={[
                      "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                      branchView
                        ? "bg-violet-500/15 text-violet-400"
                        : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300",
                    ].join(" ")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="6" y1="3" x2="6" y2="15" />
                      <circle cx="18" cy="6" r="3" />
                      <circle cx="6" cy="18" r="3" />
                      <path d="M18 9a9 9 0 0 1-9 9" />
                    </svg>
                    Branch view
                  </button>
                )}
                {sessions.length > 2 && (
                  <div className="relative">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-48 rounded-lg border border-neutral-700 bg-neutral-800/50 pl-8 pr-3 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
            {branchView ? (
              <BranchTreeView
                nodes={sessionTree}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ) : (
              <SessionList
                sessions={filteredSessions}
                isLoading={isLoading}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Branch Tree View ───────────────────────────────────────────────────── */

interface BranchTreeViewProps {
  nodes: SessionTreeNode[];
  onRename?: (id: string, newTitle: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  depth?: number;
}

function BranchTreeView({ nodes, onRename, onDelete, depth = 0 }: BranchTreeViewProps) {
  if (nodes.length === 0) return null;
  return (
    <div className={depth > 0 ? "ml-3 mt-3 border-l border-neutral-800 pl-3 sm:ml-6 sm:pl-4" : ""}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node) => (
          <div key={node.session.id}>
            <SessionCard
              session={node.session}
              onRename={onRename}
              onDelete={onDelete}
            />
            {node.children.length > 0 && (
              <BranchTreeView
                nodes={node.children}
                onRename={onRename}
                onDelete={onDelete}
                depth={depth + 1}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
