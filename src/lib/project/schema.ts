import type { Session, Track, Note, Section } from "@/lib/music/types";

export const PROJECT_SCHEMA_VERSION = 1;

export interface ProjectFileV1 {
  schemaVersion: 1;
  exportedAt: string;
  session: Pick<
    Session,
    | "id"
    | "title"
    | "description"
    | "bpm"
    | "keySignature"
    | "timeSignature"
    | "genre"
    | "mood"
    | "status"
  >;
  tracks: Track[];
  sections: Section[];
  notes: Note[];
}

export type ProjectFile = ProjectFileV1;

export function isProjectFileV1(data: unknown): data is ProjectFileV1 {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.schemaVersion === 1 &&
    typeof obj.exportedAt === "string" &&
    typeof obj.session === "object" &&
    obj.session !== null &&
    Array.isArray(obj.tracks) &&
    Array.isArray(obj.sections) &&
    Array.isArray(obj.notes)
  );
}

export function serializeProject(
  session: Session,
  tracks: Track[],
  sections: Section[],
  notes: Note[],
): ProjectFileV1 {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    session: {
      id: session.id,
      title: session.title,
      description: session.description,
      bpm: session.bpm,
      keySignature: session.keySignature,
      timeSignature: session.timeSignature,
      genre: session.genre,
      mood: session.mood,
      status: session.status,
    },
    tracks,
    sections,
    notes,
  };
}

export function parseProjectFile(raw: string): ProjectFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid project file: not valid JSON");
  }

  if (isProjectFileV1(parsed)) return parsed;

  throw new Error(
    `Unsupported or malformed project file (schemaVersion=${
      (parsed as Record<string, unknown>)?.schemaVersion ?? "unknown"
    })`,
  );
}
