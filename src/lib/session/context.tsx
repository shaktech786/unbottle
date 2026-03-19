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
import type { Session, Track, Section, Note } from "@/lib/music/types";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionContextValue {
  session: Session | null;
  tracks: Track[];
  sections: Section[];
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  addSections: (newSections: Omit<Section, "id" | "sessionId">[]) => Promise<void>;
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
    return (
      <div className="flex h-full items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-lg font-medium text-red-400">
            Failed to load session
          </p>
          <p className="mt-1 text-sm text-slate-400">{error}</p>
          <button
            onClick={fetchSession}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Retry
          </button>
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
    <div className="flex h-full flex-col bg-slate-950">
      {/* Top bar skeleton */}
      <div className="flex h-14 items-center gap-4 border-b border-slate-800 px-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>

      <div className="flex flex-1">
        {/* Left panel skeleton */}
        <div className="flex w-[380px] flex-col gap-3 border-r border-slate-800 p-4">
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
        <div className="flex w-[320px] flex-col gap-3 border-l border-slate-800 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
