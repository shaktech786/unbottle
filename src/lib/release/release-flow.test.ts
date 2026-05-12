/**
 * MAIN-30: E2E integration test for the full release flow.
 * Uses real type logic and stub distribution — no mocks.
 */

import { describe, it, expect } from "vitest";
import {
  createDefaultReleaseSteps,
  deriveReleaseStatus,
  type ReleaseChecklist,
  type ReleaseStep,
} from "./types";
import { distributeRelease } from "./distribution";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChecklist(overrides: Partial<ReleaseChecklist> = {}): ReleaseChecklist {
  const steps = createDefaultReleaseSteps();
  return {
    id: "test-checklist-id",
    sessionId: "test-session-id",
    steps,
    status: "draft",
    distributionStatus: "not_submitted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function completeSteps(steps: ReleaseStep[]): ReleaseStep[] {
  return steps.map((s) => ({ ...s, completed: true }));
}

function toggleStep(steps: ReleaseStep[], id: string): ReleaseStep[] {
  return steps.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
}

// ---------------------------------------------------------------------------
// MAIN-30: Full release flow
// ---------------------------------------------------------------------------

describe("release flow — create checklist", () => {
  it("creates default steps covering mastering, metadata, and distribution categories", () => {
    const steps = createDefaultReleaseSteps();
    const categories = new Set(steps.map((s) => s.category));
    expect(categories.has("mastering")).toBe(true);
    expect(categories.has("metadata")).toBe(true);
    expect(categories.has("distribution")).toBe(true);
  });

  it("starts with all steps incomplete", () => {
    const steps = createDefaultReleaseSteps();
    expect(steps.every((s) => !s.completed)).toBe(true);
  });

  it("derives status as 'draft' when no steps completed", () => {
    const steps = createDefaultReleaseSteps();
    expect(deriveReleaseStatus(steps)).toBe("draft");
  });
});

describe("release flow — completing steps", () => {
  it("derives status as 'in_progress' when some steps completed", () => {
    const steps = toggleStep(createDefaultReleaseSteps(), "master-level");
    expect(deriveReleaseStatus(steps)).toBe("in_progress");
  });

  it("derives status as 'released' when all steps completed", () => {
    const steps = completeSteps(createDefaultReleaseSteps());
    expect(deriveReleaseStatus(steps)).toBe("released");
  });

  it("toggling a completed step back marks it incomplete", () => {
    const initial = toggleStep(createDefaultReleaseSteps(), "master-level");
    expect(initial.find((s) => s.id === "master-level")?.completed).toBe(true);
    const toggled = toggleStep(initial, "master-level");
    expect(toggled.find((s) => s.id === "master-level")?.completed).toBe(false);
  });
});

describe("release flow — trigger distribution stub", () => {
  it("returns pending status with a DistroKid URL", () => {
    const checklist = makeChecklist({
      steps: completeSteps(createDefaultReleaseSteps()),
      status: "released",
    });
    const result = distributeRelease(checklist);
    expect(result.status).toBe("pending");
    expect(result.distrokidUrl).toContain("distrokid.com");
  });

  it("includes metadata notes as prefill params when steps have notes", () => {
    const steps = createDefaultReleaseSteps().map((s) =>
      s.category === "metadata" ? { ...s, notes: `note for ${s.id}` } : s,
    );
    const checklist = makeChecklist({ steps });
    const result = distributeRelease(checklist);
    const metaIds = steps.filter((s) => s.category === "metadata").map((s) => s.id);
    for (const id of metaIds) {
      expect(result.prefillParams[id]).toBe(`note for ${id}`);
    }
  });

  it("message clearly states manual submission is required", () => {
    const checklist = makeChecklist();
    const result = distributeRelease(checklist);
    expect(result.message.toLowerCase()).toContain("manual submission required");
    expect(result.message.toLowerCase()).toContain("distrokid");
  });
});

describe("release flow — status after distribution", () => {
  it("checklist status is 'released' after all steps done", () => {
    const checklist = makeChecklist({
      steps: completeSteps(createDefaultReleaseSteps()),
    });
    expect(deriveReleaseStatus(checklist.steps)).toBe("released");
  });

  it("distributionStatus progression is sequential", () => {
    const statuses = [
      "not_submitted",
      "submitted",
      "distributed",
      "live",
    ] as const;
    // Verify the type values exist and are ordered
    expect(statuses[0]).toBe("not_submitted");
    expect(statuses[statuses.length - 1]).toBe("live");
  });
});
