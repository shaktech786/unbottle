import { describe, it, expect } from "vitest";
import {
  serializeProject,
  parseProjectFile,
  isProjectFileV1,
  PROJECT_SCHEMA_VERSION,
} from "./schema";
import type { Session, Track, Section, Note } from "@/lib/music/types";

const session: Session = {
  id: "s1",
  userId: "u1",
  title: "Test Project",
  bpm: 120,
  keySignature: "C major",
  timeSignature: "4/4",
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  lastActiveAt: "2025-01-01T00:00:00Z",
};

const track: Track = {
  id: "t1",
  sessionId: "s1",
  name: "Piano",
  instrument: "piano",
  volume: 1,
  pan: 0,
  muted: false,
  solo: false,
  color: "#fff",
  sortOrder: 0,
};

const section: Section = {
  id: "sec1",
  sessionId: "s1",
  name: "Verse",
  type: "verse",
  startBar: 0,
  lengthBars: 4,
  chordProgression: [],
  sortOrder: 0,
  color: "#aaa",
};

const note: Note = {
  id: "n1",
  trackId: "t1",
  pitch: "C4",
  startTick: 0,
  durationTicks: 480,
  velocity: 80,
};

describe("serializeProject / parseProjectFile round-trip", () => {
  it("serializes to schemaVersion 1", () => {
    const file = serializeProject(session, [track], [section], [note]);
    expect(file.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(file.session.title).toBe("Test Project");
    expect(file.tracks).toHaveLength(1);
    expect(file.sections).toHaveLength(1);
    expect(file.notes).toHaveLength(1);
  });

  it("round-trips through JSON string", () => {
    const file = serializeProject(session, [track], [section], [note]);
    const json = JSON.stringify(file);
    const parsed = parseProjectFile(json);
    expect(isProjectFileV1(parsed)).toBe(true);
    expect(parsed.session.id).toBe("s1");
    expect(parsed.notes[0].pitch).toBe("C4");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseProjectFile("not json")).toThrow("not valid JSON");
  });

  it("throws on missing schemaVersion", () => {
    const bad = JSON.stringify({ session, tracks: [], sections: [], notes: [] });
    expect(() => parseProjectFile(bad)).toThrow("Unsupported or malformed");
  });

  it("throws on unknown schemaVersion", () => {
    const bad = JSON.stringify({
      schemaVersion: 99,
      exportedAt: "now",
      session,
      tracks: [],
      sections: [],
      notes: [],
    });
    expect(() => parseProjectFile(bad)).toThrow("schemaVersion=99");
  });
});
