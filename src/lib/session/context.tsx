"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import type { Session, Track, Section, Note } from "@/lib/music/types";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionContextValue {
  session: Session | null;
  tracks: Track[];
  sections: Section[];
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  addSections: (newSections: Omit<Section, "id" | "sessionId">[]) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  updateSection: (sectionId: string, updates: Partial<Omit<Section, "id" | "sessionId">>) => Promise<void>;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  isLoading: boolean;
  error: string | null;
  updateSession: (updates: Partial<Session>) => void;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  sessionId: string;
  children: ReactNode;
}

export function SessionProvider({ sessionId, children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pendingUpdates = useRef<Partial<Session>>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to load session");
      }
      const data = await res.json();
      setSession(data.session);
      setTracks(data.tracks ?? []);
      setSections(data.sections ?? []);
      setNotes(data.notes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const flushUpdates = useCallback(async () => {
    const updates = { ...pendingUpdates.current };
    pendingUpdates.current = {};

    if (Object.keys(updates).length === 0) return;

    try {
      const res = await fetch(`/api/session/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      const data = await res.json();
      setSession(data.session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }, [sessionId]);

  const updateTrack = useCallback(
    (trackId: string, updates: Partial<Track>) => {
      // Optimistic update
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, ...updates } : t))
      );

      // Persist via API (fire-and-forget)
      fetch(`/api/session/${sessionId}/tracks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, updates }),
      }).catch(() => {
        // Revert on failure — refetch
        fetchSession();
      });
    },
    [sessionId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const updateSession = useCallback(
    (updates: Partial<Session>) => {
      // Optimistic update
      setSession((prev) => (prev ? { ...prev, ...updates } : prev));

      // Accumulate pending updates
      pendingUpdates.current = { ...pendingUpdates.current, ...updates };

      // Debounce the save
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        flushUpdates();
      }, 2000);
    },
    [flushUpdates],
  );

  const addSections = useCallback(
    async (newSections: Omit<Section, "id" | "sessionId">[]) => {
      if (newSections.length === 0) return;
      try {
        const res = await fetch(`/api/session/${sessionId}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: newSections }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to save sections");
        }
        const data = (await res.json()) as { sections: Section[] };
        setSections((prev) => [...prev, ...data.sections]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add sections");
      }
    },
    [sessionId],
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      // Optimistic removal
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      try {
        const res = await fetch(`/api/session/${sessionId}/sections`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to delete section");
        }
      } catch (e) {
        // Revert on failure by re-fetching
        setError(e instanceof Error ? e.message : "Failed to delete section");
        try {
          const res = await fetch(`/api/session/${sessionId}/sections`);
          if (res.ok) {
            const data = (await res.json()) as { sections: Section[] };
            setSections(data.sections);
          }
        } catch {
          // Best effort revert
        }
      }
    },
    [sessionId],
  );

  const updateSection = useCallback(
    async (sectionId: string, updates: Partial<Omit<Section, "id" | "sessionId">>) => {
      // Optimistic update
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
      );
      try {
        const res = await fetch(`/api/session/${sessionId}/sections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId, updates }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to update section");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update section");
      }
    },
    [sessionId],
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      // Fire-and-forget final save
      const updates = { ...pendingUpdates.current };
      if (Object.keys(updates).length > 0) {
        fetch(`/api/session/${sessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }).catch(() => {
          // Best effort on unmount
        });
      }
    };
  }, [sessionId]);

  if (isLoading) {
    return <SessionLoadingSkeleton />;
  }

  if (error) {
    const isNotFound =
      error.toLowerCase().includes("not found") ||
      error.toLowerCase().includes("404");

    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <div className="mx-auto max-w-sm text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <p className="text-lg font-medium text-neutral-200">
            {isNotFound ? "Session not found" : "Failed to load session"}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            {isNotFound
              ? "This session may have been deleted or the link is incorrect."
              : "Something went wrong loading this session."}
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            {isNotFound ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-400"
              >
                Back to Dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={fetchSession}
                  className="inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-400"
                >
                  Try Again
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
                >
                  Dashboard
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        tracks,
        sections,
        notes,
        setNotes,
        addSections,
        deleteSection,
        updateSection,
        updateTrack,
        isLoading,
        error,
        updateSession,
        refreshSession: fetchSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return ctx;
}

function SessionLoadingSkeleton() {
  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      {/* Top bar skeleton */}
      <div className="flex h-14 items-center gap-4 border-b border-neutral-800 px-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>

      <div className="flex flex-1">
        {/* Left panel skeleton */}
        <div className="flex w-[380px] flex-col gap-3 border-r border-neutral-800 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Center skeleton */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>

        {/* Right panel skeleton */}
        <div className="flex w-[320px] flex-col gap-3 border-l border-neutral-800 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
