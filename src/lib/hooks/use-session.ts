"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Session, Track, Section } from "@/lib/music/types";

interface UseSessionReturn {
  session: Session | null;
  tracks: Track[];
  sections: Section[];
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  createSession: (data?: CreateSessionInput) => Promise<Session | null>;
  loadSession: (id: string) => Promise<void>;
  updateSession: (
    id: string,
    updates: Partial<Session>,
  ) => Promise<Session | null>;
  listSessions: () => Promise<void>;
}

export interface CreateSessionInput {
  title?: string;
  description?: string;
  bpm?: number;
  keySignature?: string;
  timeSignature?: string;
  genre?: string;
  mood?: string;
  /** Template sections to auto-create after session creation */
  templateSections?: Omit<Section, "id" | "sessionId">[];
  /** Template tracks to auto-create (replaces default piano track) */
  templateTracks?: Omit<Track, "id" | "sessionId">[];
}

export function useSession(): UseSessionReturn {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSessionFn = useCallback(
    async (data?: CreateSessionInput): Promise<Session | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // Strip template data from the API payload (handled client-side)
        const { templateSections, templateTracks, ...sessionPayload } = data ?? {};

        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessionPayload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to create session");
        }

        const { session: newSession } = await res.json();
        setSession(newSession);

        // If template includes sections, create them
        if (templateSections && templateSections.length > 0) {
          await fetch(`/api/session/${newSession.id}/sections`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sections: templateSections }),
          }).catch(() => {
            // Best effort -- sections can be added later
          });
        }

        // If template includes tracks, create them
        if (templateTracks && templateTracks.length > 0) {
          for (const track of templateTracks) {
            await fetch(`/api/session/${newSession.id}/tracks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(track),
            }).catch(() => {
              // Best effort
            });
          }
        }

        router.push(`/session/${newSession.id}`);
        return newSession as Session;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const loadSession = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${id}`);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to load session");
      }

      const data = await res.json();
      setSession(data.session);
      setTracks(data.tracks ?? []);
      setSections(data.sections ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSessionFn = useCallback(
    async (
      id: string,
      updates: Partial<Session>,
    ): Promise<Session | null> => {
      setError(null);
      try {
        const res = await fetch(`/api/session/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to update session");
        }

        const { session: updated } = await res.json();
        setSession(updated);
        return updated as Session;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setError(message);
        return null;
      }
    },
    [],
  );

  const listSessionsFn = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/session");

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to list sessions");
      }

      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    session,
    tracks,
    sections,
    sessions,
    isLoading,
    error,
    createSession: createSessionFn,
    loadSession,
    updateSession: updateSessionFn,
    listSessions: listSessionsFn,
  };
}
