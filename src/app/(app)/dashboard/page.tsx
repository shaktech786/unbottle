"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { SessionList } from "@/components/session/session-list";
import { useSession } from "@/lib/hooks/use-session";

export default function DashboardPage() {
  const router = useRouter();
  const { sessions, isLoading, listSessions, createSession } = useSession();

  useEffect(() => {
    listSessions();
  }, [listSessions]);

  async function handleNewSession() {
    await createSession();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Welcome + action */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-slate-400">
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

        {/* Quick start card for empty state */}
        {!isLoading && sessions.length === 0 && (
          <button
            onClick={handleNewSession}
            className="mb-8 flex w-full items-center gap-6 rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-600/5 p-8 text-left transition-colors hover:border-indigo-500/50 hover:bg-indigo-600/10"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600/20">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-indigo-400"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-indigo-300">
                Just Start
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Jump in with defaults (120 BPM, key of C). You can change
                everything later.
              </p>
            </div>
          </button>
        )}

        {/* Or go to the session creation page */}
        {!isLoading && sessions.length === 0 && (
          <div className="mb-8 text-center">
            <button
              onClick={() => router.push("/session/new")}
              className="text-sm text-slate-400 underline underline-offset-4 hover:text-slate-200"
            >
              Or configure a session first
            </button>
          </div>
        )}

        {/* Recent sessions */}
        <div>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">
            Recent Sessions
          </h3>
          <SessionList sessions={sessions} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
