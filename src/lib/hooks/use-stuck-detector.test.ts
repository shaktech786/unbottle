import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isStuck } from "./use-stuck-detector";
import { CONSTRAINT_POOL, pickRandomConstraint } from "@/lib/daw/creative-constraints";

// ---------------------------------------------------------------------------
// isStuck — pure helper
// ---------------------------------------------------------------------------

describe("isStuck", () => {
  it("returns false before threshold", () => {
    const now = 10_000;
    const lastEdit = 9_000;
    expect(isStuck(lastEdit, now, 5_000)).toBe(false); // 1s elapsed < 5s threshold
  });

  it("returns true at exactly the threshold", () => {
    const lastEdit = 0;
    const now = 5_000;
    expect(isStuck(lastEdit, now, 5_000)).toBe(true);
  });

  it("returns true after threshold", () => {
    const lastEdit = 0;
    const now = 10_000;
    expect(isStuck(lastEdit, now, 5_000)).toBe(true);
  });

  it("returns false when editing continuously (lastEdit close to now)", () => {
    const now = Date.now();
    expect(isStuck(now - 100, now, 5_000)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StuckDetector timer behaviour — via fake timers
// ---------------------------------------------------------------------------

describe("stuck detector timer (simulated)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onStuck after threshold elapses without edits", () => {
    const onStuck = vi.fn();
    let lastEditMs = Date.now();

    // Simulate the poll loop: check every 5 s
    const THRESHOLD_MS = 60_000; // 1 minute
    let fired = false;

    const interval = setInterval(() => {
      if (fired) return;
      if (isStuck(lastEditMs, Date.now(), THRESHOLD_MS)) {
        fired = true;
        onStuck();
      }
    }, 5_000);

    // Advance 65 seconds — should have fired
    vi.advanceTimersByTime(65_000);
    clearInterval(interval);

    expect(onStuck).toHaveBeenCalledTimes(1);
  });

  it("does not fire if notifyEdit resets the timer", () => {
    const onStuck = vi.fn();
    const THRESHOLD_MS = 30_000;
    let lastEditMs = Date.now();
    let fired = false;

    const interval = setInterval(() => {
      if (fired) return;
      if (isStuck(lastEditMs, Date.now(), THRESHOLD_MS)) {
        fired = true;
        onStuck();
      }
    }, 5_000);

    // Edit at 20s — resets the clock
    vi.advanceTimersByTime(20_000);
    lastEditMs = Date.now(); // notifyEdit

    // Advance another 25s — only 25s since last edit, not yet at 30s
    vi.advanceTimersByTime(25_000);
    clearInterval(interval);

    expect(onStuck).not.toHaveBeenCalled();
  });

  it("fires after threshold when editing stops after a reset", () => {
    const onStuck = vi.fn();
    const THRESHOLD_MS = 30_000;
    let lastEditMs = Date.now();
    let fired = false;

    const interval = setInterval(() => {
      if (fired) return;
      if (isStuck(lastEditMs, Date.now(), THRESHOLD_MS)) {
        fired = true;
        onStuck();
      }
    }, 5_000);

    // Edit at 20s, then go idle
    vi.advanceTimersByTime(20_000);
    lastEditMs = Date.now();

    // 35 more seconds of idle — crosses threshold
    vi.advanceTimersByTime(35_000);
    clearInterval(interval);

    expect(onStuck).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Creative constraint pool
// ---------------------------------------------------------------------------

describe("creative constraints pool", () => {
  it("has at least 20 entries", () => {
    expect(CONSTRAINT_POOL.length).toBeGreaterThanOrEqual(20);
  });

  it("has no duplicate ids", () => {
    const ids = CONSTRAINT_POOL.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("has no duplicate texts", () => {
    const texts = CONSTRAINT_POOL.map((c) => c.text);
    const unique = new Set(texts);
    expect(unique.size).toBe(texts.length);
  });

  it("all entries have non-empty text", () => {
    for (const c of CONSTRAINT_POOL) {
      expect(c.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("pickRandomConstraint returns a valid constraint", () => {
    const result = pickRandomConstraint();
    expect(CONSTRAINT_POOL.find((c) => c.id === result.id)).toBeDefined();
  });

  it("pickRandomConstraint excludes the specified id", () => {
    const first = CONSTRAINT_POOL[0];
    // Run 20 picks — excluded id should never appear
    for (let i = 0; i < 20; i++) {
      const result = pickRandomConstraint(first.id);
      expect(result.id).not.toBe(first.id);
    }
  });
});
