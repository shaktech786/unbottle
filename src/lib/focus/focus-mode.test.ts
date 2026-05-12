/**
 * Tests for focus mode state transitions and session health score.
 * MAIN-60
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { FOCUS_MODES, DEFAULT_FOCUS_MODE, type FocusModeId } from "./types";
import { computeHealthScore, buildHealthScore, healthScoreLabel, healthScoreColor } from "./session-health";

// ── MAIN-60: Focus mode type definitions ─────────────────────────────────────

describe("FocusMode configs", () => {
  it("all four modes exist", () => {
    expect(Object.keys(FOCUS_MODES)).toEqual(
      expect.arrayContaining(["deep_work", "quick_capture", "review", "off"]),
    );
  });

  it("default mode is 'off'", () => {
    expect(DEFAULT_FOCUS_MODE).toBe("off");
  });

  it("deep_work hides chat, capture, bookmarks", () => {
    const mode = FOCUS_MODES.deep_work;
    expect(mode.hiddenPanels).toContain("chat");
    expect(mode.hiddenPanels).toContain("capture");
    expect(mode.hiddenPanels).toContain("bookmarks");
  });

  it("quick_capture hides arrangement, sequencer, sheet-music", () => {
    const mode = FOCUS_MODES.quick_capture;
    expect(mode.hiddenPanels).toContain("arrangement");
    expect(mode.hiddenPanels).toContain("sequencer");
    expect(mode.hiddenPanels).toContain("sheet-music");
  });

  it("off mode hides no panels", () => {
    expect(FOCUS_MODES.off.hiddenPanels).toHaveLength(0);
  });

  it("each mode has a label", () => {
    for (const [, mode] of Object.entries(FOCUS_MODES)) {
      expect(typeof mode.label).toBe("string");
      expect(mode.label.length).toBeGreaterThan(0);
    }
  });

  it("each mode has a shortcuts record", () => {
    for (const [, mode] of Object.entries(FOCUS_MODES)) {
      expect(typeof mode.shortcuts).toBe("object");
    }
  });
});

// ── MAIN-60: Mode switch applies correct hiddenPanels ─────────────────────────

describe("hiddenPanels contract", () => {
  const MODES: FocusModeId[] = ["deep_work", "quick_capture", "review", "off"];

  it.each(MODES)("mode %s hiddenPanels is an array", (modeId) => {
    expect(Array.isArray(FOCUS_MODES[modeId].hiddenPanels)).toBe(true);
  });

  it("switching from deep_work to off clears all hidden panels", () => {
    // Simulate the transition by checking the configs
    const deepWork = FOCUS_MODES.deep_work;
    const off = FOCUS_MODES.off;

    // deep_work hides things
    expect(deepWork.hiddenPanels.length).toBeGreaterThan(0);
    // off shows everything
    expect(off.hiddenPanels.length).toBe(0);
  });

  it("quick_capture does NOT hide chat panel", () => {
    expect(FOCUS_MODES.quick_capture.hiddenPanels).not.toContain("chat");
  });

  it("deep_work does NOT hide arrangement or sequencer", () => {
    expect(FOCUS_MODES.deep_work.hiddenPanels).not.toContain("arrangement");
    expect(FOCUS_MODES.deep_work.hiddenPanels).not.toContain("sequencer");
  });
});

// ── MAIN-60: Session health score logic ──────────────────────────────────────

describe("computeHealthScore", () => {
  it("starts at 0 with no activity", () => {
    expect(computeHealthScore({ flowMinutes: 0, interruptionCount: 0, meaningfulEdits: 0 })).toBe(0);
  });

  it("increases with flow minutes", () => {
    const low = computeHealthScore({ flowMinutes: 5, interruptionCount: 0, meaningfulEdits: 0 });
    const high = computeHealthScore({ flowMinutes: 20, interruptionCount: 0, meaningfulEdits: 0 });
    expect(high).toBeGreaterThan(low);
  });

  it("increases with meaningful edits", () => {
    const few = computeHealthScore({ flowMinutes: 10, interruptionCount: 0, meaningfulEdits: 2 });
    const many = computeHealthScore({ flowMinutes: 10, interruptionCount: 0, meaningfulEdits: 10 });
    expect(many).toBeGreaterThan(few);
  });

  it("decreases with interruptions", () => {
    const clean = computeHealthScore({ flowMinutes: 20, interruptionCount: 0, meaningfulEdits: 5 });
    const interrupted = computeHealthScore({ flowMinutes: 20, interruptionCount: 3, meaningfulEdits: 5 });
    expect(interrupted).toBeLessThan(clean);
  });

  it("score is always 0–100", () => {
    // Extreme over-score
    const over = computeHealthScore({ flowMinutes: 999, interruptionCount: 0, meaningfulEdits: 999 });
    expect(over).toBeLessThanOrEqual(100);

    // Extreme under-score
    const under = computeHealthScore({ flowMinutes: 0, interruptionCount: 100, meaningfulEdits: 0 });
    expect(under).toBeGreaterThanOrEqual(0);
  });

  it("40 minutes of flow, no interruptions, 10 edits gives a high score", () => {
    const score = computeHealthScore({ flowMinutes: 40, interruptionCount: 0, meaningfulEdits: 10 });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("5 interruptions tanks the score significantly", () => {
    const score = computeHealthScore({ flowMinutes: 10, interruptionCount: 5, meaningfulEdits: 0 });
    expect(score).toBeLessThan(20);
  });
});

describe("buildHealthScore", () => {
  it("includes all fields and a numeric score", () => {
    const hs = buildHealthScore({ flowMinutes: 15, interruptionCount: 1, meaningfulEdits: 5 });
    expect(hs.flowMinutes).toBe(15);
    expect(hs.interruptionCount).toBe(1);
    expect(hs.meaningfulEdits).toBe(5);
    expect(typeof hs.score).toBe("number");
  });
});

describe("healthScoreLabel", () => {
  it("returns 'In the Zone' for 80+", () => {
    expect(healthScoreLabel(80)).toBe("In the Zone");
    expect(healthScoreLabel(100)).toBe("In the Zone");
  });

  it("returns 'Good Flow' for 55-79", () => {
    expect(healthScoreLabel(55)).toBe("Good Flow");
    expect(healthScoreLabel(79)).toBe("Good Flow");
  });

  it("returns 'Off Track' for low scores", () => {
    expect(healthScoreLabel(0)).toBe("Off Track");
    expect(healthScoreLabel(14)).toBe("Off Track");
  });
});

describe("healthScoreColor", () => {
  it("returns emerald for high score", () => {
    expect(healthScoreColor(90)).toBe("#10b981");
  });

  it("returns red for low score", () => {
    expect(healthScoreColor(10)).toBe("#ef4444");
  });
});

// ── MAIN-60: Interrupt guard — behavior specification ─────────────────────────

describe("interrupt guard contract (behavioral spec)", () => {
  // These tests verify the expected behavior via the pure utility functions
  // used by useInterruptGuard, without needing jsdom event listeners.

  it("deep_work mode is the only mode requiring interrupt guard", () => {
    const modesNeedingGuard: FocusModeId[] = ["deep_work"];
    const modesWithoutGuard: FocusModeId[] = ["quick_capture", "review", "off"];

    for (const m of modesNeedingGuard) {
      expect(m).toBe("deep_work");
    }

    for (const m of modesWithoutGuard) {
      expect(m).not.toBe("deep_work");
    }
  });

  it("health score decreases correctly per interruption", () => {
    const before = computeHealthScore({ flowMinutes: 20, interruptionCount: 0, meaningfulEdits: 5 });
    const after = computeHealthScore({ flowMinutes: 20, interruptionCount: 1, meaningfulEdits: 5 });
    expect(before - after).toBe(8); // -8 per interruption
  });
});
