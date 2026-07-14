import type { Session, Track, Note, Section } from "@/lib/music/types";
import { serializeProject } from "./schema";
import { saveProjectToIDB } from "./idb";

const AUTOSAVE_INTERVAL_MS = 30_000;

export interface AutosaveHandle {
  markDirty(): void;
  stop(): void;
}

export function startAutosave(
  getState: () => {
    session: Session;
    tracks: Track[];
    sections: Section[];
    notes: Note[];
  },
  onSaved?: (savedAt: string) => void,
  onError?: (err: unknown) => void,
): AutosaveHandle {
  let dirty = false;

  const timer = setInterval(async () => {
    if (!dirty) return;
    dirty = false;
    try {
      const { session, tracks, sections, notes } = getState();
      const project = serializeProject(session, tracks, sections, notes);
      await saveProjectToIDB(session.id, session.title, project);
      onSaved?.(new Date().toISOString());
    } catch (err) {
      onError?.(err);
    }
  }, AUTOSAVE_INTERVAL_MS);

  return {
    markDirty() {
      dirty = true;
    },
    stop() {
      clearInterval(timer);
    },
  };
}
