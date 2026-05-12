import { describe, it, expect } from "vitest";
import { UndoStack } from "./undo-stack";
import type { DAWSnapshot } from "./undo-stack";

function snap(bpm: number): DAWSnapshot {
  return { tracks: [], sections: [], notes: [], bpm, keySignature: "C major" };
}

describe("UndoStack", () => {
  it("starts empty", () => {
    const s = new UndoStack();
    expect(s.canUndo()).toBe(false);
    expect(s.canRedo()).toBe(false);
  });

  it("undo returns pushed snapshot and restores state", () => {
    const s = new UndoStack();
    s.push(snap(120));
    const current = snap(140);
    const restored = s.undo(current);
    expect(restored?.bpm).toBe(120);
    expect(s.canUndo()).toBe(false);
    expect(s.canRedo()).toBe(true);
  });

  it("redo re-applies undone state", () => {
    const s = new UndoStack();
    s.push(snap(120));
    const at140 = snap(140);
    s.undo(at140);
    const redone = s.redo(snap(120));
    expect(redone?.bpm).toBe(140);
    expect(s.canRedo()).toBe(false);
  });

  it("new push clears redo branch", () => {
    const s = new UndoStack();
    s.push(snap(100));
    s.undo(snap(110));
    expect(s.canRedo()).toBe(true);
    s.push(snap(120));
    expect(s.canRedo()).toBe(false);
  });

  it("caps history at 50 entries", () => {
    const s = new UndoStack();
    for (let i = 0; i < 60; i++) s.push(snap(i));
    expect(s.pastLength).toBe(50);
    // Oldest should be 10, not 0
    const snapshots: DAWSnapshot[] = [];
    let cur = snap(200);
    for (let i = 0; i < 50; i++) {
      const prev = s.undo(cur);
      if (!prev) break;
      snapshots.push(prev);
      cur = prev;
    }
    const bpms = snapshots.map((s) => s.bpm);
    expect(bpms[0]).toBe(59);
    expect(bpms[bpms.length - 1]).toBe(10);
  });

  it("clear resets both stacks", () => {
    const s = new UndoStack();
    s.push(snap(120));
    s.push(snap(130));
    s.clear();
    expect(s.canUndo()).toBe(false);
    expect(s.canRedo()).toBe(false);
  });

  it("snapshots are deep-cloned (mutations don't affect history)", () => {
    const s = new UndoStack();
    const original = snap(120);
    s.push(original);
    original.bpm = 999;
    const restored = s.undo(snap(130));
    expect(restored?.bpm).toBe(120);
  });
});
