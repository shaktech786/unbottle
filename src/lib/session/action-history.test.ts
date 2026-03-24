import { describe, it, expect } from "vitest";
import { ActionHistory } from "./action-history";
import type { SessionSnapshot } from "./action-history";

function makeSnapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sections: [],
    notes: [],
    bpm: 120,
    keySignature: "C",
    ...overrides,
  };
}

describe("ActionHistory", () => {
  it("starts with canUndo false", () => {
    const history = new ActionHistory();
    expect(history.canUndo()).toBe(false);
  });

  it("undo on empty returns null", () => {
    const history = new ActionHistory();
    expect(history.undo()).toBeNull();
  });

  it("push then undo returns the pushed snapshot", () => {
    const history = new ActionHistory();
    const snap = makeSnapshot({ bpm: 100 });
    history.push(snap);

    expect(history.canUndo()).toBe(true);
    const result = history.undo();
    expect(result).toEqual(snap);
  });

  it("after undo, canUndo is false (single item)", () => {
    const history = new ActionHistory();
    history.push(makeSnapshot());
    history.undo();
    expect(history.canUndo()).toBe(false);
  });

  it("multiple pushes, multiple undos return in reverse order", () => {
    const history = new ActionHistory();
    const snap1 = makeSnapshot({ bpm: 100 });
    const snap2 = makeSnapshot({ bpm: 110 });
    const snap3 = makeSnapshot({ bpm: 120 });

    history.push(snap1);
    history.push(snap2);
    history.push(snap3);

    expect(history.undo()).toEqual(snap3);
    expect(history.undo()).toEqual(snap2);
    expect(history.undo()).toEqual(snap1);
    expect(history.undo()).toBeNull();
  });

  it("canUndo returns correct boolean after multiple pushes and undos", () => {
    const history = new ActionHistory();
    expect(history.canUndo()).toBe(false);

    history.push(makeSnapshot({ bpm: 100 }));
    expect(history.canUndo()).toBe(true);

    history.push(makeSnapshot({ bpm: 110 }));
    expect(history.canUndo()).toBe(true);

    history.undo();
    expect(history.canUndo()).toBe(true);

    history.undo();
    expect(history.canUndo()).toBe(false);
  });

  it("respects default maxSize of 20", () => {
    const history = new ActionHistory();

    // Push 25 snapshots
    for (let i = 0; i < 25; i++) {
      history.push(makeSnapshot({ bpm: 60 + i }));
    }

    // Should only be able to undo 20 times
    let undoCount = 0;
    while (history.canUndo()) {
      history.undo();
      undoCount++;
    }
    expect(undoCount).toBe(20);
  });

  it("respects custom maxSize", () => {
    const history = new ActionHistory(5);

    // Push 10 snapshots
    for (let i = 0; i < 10; i++) {
      history.push(makeSnapshot({ bpm: 60 + i }));
    }

    let undoCount = 0;
    while (history.canUndo()) {
      history.undo();
      undoCount++;
    }
    expect(undoCount).toBe(5);
  });

  it("oldest snapshots are dropped when maxSize exceeded", () => {
    const history = new ActionHistory(3);

    history.push(makeSnapshot({ bpm: 100 }));
    history.push(makeSnapshot({ bpm: 110 }));
    history.push(makeSnapshot({ bpm: 120 }));
    history.push(makeSnapshot({ bpm: 130 })); // This should evict bpm=100

    const snap3 = history.undo();
    expect(snap3).toEqual(makeSnapshot({ bpm: 130 }));

    const snap2 = history.undo();
    expect(snap2).toEqual(makeSnapshot({ bpm: 120 }));

    const snap1 = history.undo();
    expect(snap1).toEqual(makeSnapshot({ bpm: 110 }));

    // bpm=100 was evicted
    expect(history.undo()).toBeNull();
  });

  it("clear empties all history", () => {
    const history = new ActionHistory();
    history.push(makeSnapshot({ bpm: 100 }));
    history.push(makeSnapshot({ bpm: 110 }));

    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.undo()).toBeNull();
  });

  it("clear allows pushing new items after", () => {
    const history = new ActionHistory();
    history.push(makeSnapshot({ bpm: 100 }));
    history.clear();

    history.push(makeSnapshot({ bpm: 200 }));
    expect(history.canUndo()).toBe(true);
    expect(history.undo()).toEqual(makeSnapshot({ bpm: 200 }));
  });

  it("preserves snapshot data integrity (deep comparison)", () => {
    const history = new ActionHistory();
    const snap = makeSnapshot({
      bpm: 90,
      keySignature: "Dm",
      genre: "Lo-Fi",
      mood: "Chill",
      sections: [
        {
          id: "s1",
          sessionId: "session-1",
          name: "Intro",
          type: "intro",
          startBar: 0,
          lengthBars: 4,
          chordProgression: [
            { chord: { root: "D", quality: "minor" }, durationBars: 2 },
          ],
          sortOrder: 0,
          color: "#6366f1",
        },
      ],
      notes: [
        {
          id: "n1",
          trackId: "t1",
          pitch: "C4",
          startTick: 0,
          durationTicks: 480,
          velocity: 100,
        },
      ],
    });

    history.push(snap);
    const result = history.undo();
    expect(result).toEqual(snap);
  });
});
