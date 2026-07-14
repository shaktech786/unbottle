// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { ExportDialog } from "./export-dialog";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Note, Session, Track } from "@/lib/music/types";

const { useSessionContextMock } = vi.hoisted(() => ({
  useSessionContextMock: vi.fn(),
}));

vi.mock("@/lib/session/context", () => ({
  useSessionContext: useSessionContextMock,
}));

// jsdom does not implement <dialog> modal behavior.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

afterEach(() => {
  cleanup();
  useSessionContextMock.mockReset();
});

function makeSession(overrides: Partial<Session> = {}): Session {
  const now = new Date().toISOString();
  return {
    id: "sess-1",
    userId: "user-1",
    title: "Midnight Jam",
    status: "active",
    bpm: 120,
    keySignature: "C major",
    timeSignature: "4/4",
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    trackId: "track-1",
    pitch: "C4",
    startTick: 0,
    durationTicks: 480,
    velocity: 100,
    ...overrides,
  };
}

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "track-1",
    sessionId: "sess-1",
    name: "Piano",
    instrument: "piano",
    volume: 1,
    pan: 0,
    muted: false,
    solo: false,
    color: "#fff",
    sortOrder: 0,
    ...overrides,
  };
}

function setSessionContext(notes: Note[], tracks: Track[] = [makeTrack()]) {
  useSessionContextMock.mockReturnValue({
    session: makeSession(),
    notes,
    tracks,
    sections: [],
    setNotes: vi.fn(),
    addSections: vi.fn(),
    deleteSection: vi.fn(),
    clearSections: vi.fn(),
    updateSection: vi.fn(),
    updateTrack: vi.fn(),
    isLoading: false,
    error: null,
    updateSession: vi.fn(),
    refreshSession: vi.fn(),
  });
}

function renderDialog() {
  return render(
    <ToastProvider>
      <ExportDialog open sessionId="sess-1" onClose={vi.fn()} />
    </ToastProvider>,
  );
}

/** Scope queries to the "MIDI File" export section, since the MusicXML and
 * WAV sections render the same "No notes to export" label when notes are empty. */
function getMidiSection(): HTMLElement {
  const heading = screen.getByRole("heading", { name: "MIDI File" });
  const section = heading.closest("div.rounded-lg");
  if (!section) throw new Error("Could not find MIDI export section");
  return section as HTMLElement;
}

describe("ExportDialog MIDI export button", () => {
  it("disables the MIDI export button and shows 'No notes to export' when there are no notes", () => {
    setSessionContext([]);
    renderDialog();

    const button = within(getMidiSection()).getByRole("button", {
      name: "No notes to export",
    });
    expect(button).toBeDisabled();
  });

  it("enables the MIDI export button and shows 'Export MIDI' when notes exist", () => {
    setSessionContext([makeNote()]);
    renderDialog();

    const button = within(getMidiSection()).getByRole("button", {
      name: "Export MIDI",
    });
    expect(button).toBeEnabled();
  });
});
