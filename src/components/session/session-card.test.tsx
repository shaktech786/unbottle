// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionCard } from "./session-card";
import type { Session } from "@/lib/music/types";

afterEach(() => {
  cleanup();
});

function makeSession(overrides: Partial<Session> = {}): Session {
  const now = new Date().toISOString();
  return {
    id: "sess-1",
    userId: "user-1",
    title: "Midnight Jam",
    status: "active",
    bpm: 92,
    keySignature: "C major",
    timeSignature: "4/4",
    genre: "Hip-Hop",
    mood: "Chill",
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    ...overrides,
  };
}

describe("SessionCard", () => {
  it("renders the title, metadata badges, and status indicator", () => {
    render(<SessionCard session={makeSession()} />);

    expect(
      screen.getByRole("heading", { name: "Midnight Jam" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hip-Hop")).toBeInTheDocument();
    expect(screen.getByText("Chill")).toBeInTheDocument();
    expect(screen.getByText("92 BPM")).toBeInTheDocument();
    expect(screen.getByText("C major")).toBeInTheDocument();
    expect(screen.getByTitle("active")).toBeInTheDocument();
  });

  it("renders a relative 'Just now' timestamp for a fresh session", () => {
    render(<SessionCard session={makeSession()} />);
    expect(screen.getByText("Just now")).toBeInTheDocument();
  });

  it("invokes onRename with the trimmed new title after editing", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue(undefined);

    render(<SessionCard session={makeSession()} onRename={onRename} />);

    await user.click(screen.getByTitle("Rename session"));

    const input = screen.getByDisplayValue("Midnight Jam") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "  Morning Jam  ");
    await user.keyboard("{Enter}");

    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith("sess-1", "Morning Jam");
  });

  it("does not invoke onRename when the title is unchanged", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue(undefined);

    render(<SessionCard session={makeSession()} onRename={onRename} />);

    await user.click(screen.getByTitle("Rename session"));
    await user.keyboard("{Enter}");

    expect(onRename).not.toHaveBeenCalled();
  });

  it("invokes onDelete with the session id when archive is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(<SessionCard session={makeSession()} onDelete={onDelete} />);

    await user.click(screen.getByTitle("Archive session"));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("sess-1");
  });

  it("hides rename / archive buttons when no callbacks are provided", () => {
    render(<SessionCard session={makeSession()} />);
    expect(screen.queryByTitle("Rename session")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Archive session")).not.toBeInTheDocument();
  });

  it("renders a Fork badge when the session has a parent branch", () => {
    render(
      <SessionCard session={makeSession({ parentBranchId: "parent-1" })} />,
    );
    expect(screen.getByText("Fork")).toBeInTheDocument();
  });
});
