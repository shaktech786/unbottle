import { describe, it, expect } from "vitest";
import { reorderSections } from "./section-reorder";
import type { Section } from "./types";

function makeSection(overrides: Partial<Section> & { id: string; startBar: number; lengthBars: number; sortOrder: number }): Section {
  return {
    sessionId: "session-1",
    name: `Section ${overrides.sortOrder}`,
    type: "verse",
    chordProgression: [],
    color: "#000",
    ...overrides,
  };
}

function makeSections(): Section[] {
  return [
    makeSection({ id: "intro", startBar: 0, lengthBars: 4, sortOrder: 0, type: "intro", name: "Intro" }),
    makeSection({ id: "verse1", startBar: 4, lengthBars: 8, sortOrder: 1, type: "verse", name: "Verse 1" }),
    makeSection({ id: "chorus1", startBar: 12, lengthBars: 8, sortOrder: 2, type: "chorus", name: "Chorus 1" }),
    makeSection({ id: "bridge", startBar: 20, lengthBars: 4, sortOrder: 3, type: "bridge", name: "Bridge" }),
    makeSection({ id: "outro", startBar: 24, lengthBars: 4, sortOrder: 4, type: "outro", name: "Outro" }),
  ];
}

describe("reorderSections", () => {
  it("returns a new array (immutable)", () => {
    const original = makeSections();
    const result = reorderSections(original, 0, 1);
    expect(result).not.toBe(original);
    // Original should be unchanged
    expect(original[0].id).toBe("intro");
  });

  it("moves section from index 0 to index 2", () => {
    const sections = makeSections();
    const result = reorderSections(sections, 0, 2);

    expect(result.map((s) => s.id)).toEqual([
      "verse1", "chorus1", "intro", "bridge", "outro",
    ]);
  });

  it("moves section from index 3 to index 0", () => {
    const sections = makeSections();
    const result = reorderSections(sections, 3, 0);

    expect(result.map((s) => s.id)).toEqual([
      "bridge", "intro", "verse1", "chorus1", "outro",
    ]);
  });

  it("recalculates startBar sequentially after reorder", () => {
    const sections = makeSections();
    const result = reorderSections(sections, 0, 2);

    // After reorder: verse1(8), chorus1(8), intro(4), bridge(4), outro(4)
    expect(result[0].startBar).toBe(0);
    expect(result[1].startBar).toBe(8);   // 0 + 8
    expect(result[2].startBar).toBe(16);  // 8 + 8
    expect(result[3].startBar).toBe(20);  // 16 + 4
    expect(result[4].startBar).toBe(24);  // 20 + 4
  });

  it("updates sortOrder to match new positions", () => {
    const sections = makeSections();
    const result = reorderSections(sections, 0, 2);

    result.forEach((s, i) => {
      expect(s.sortOrder).toBe(i);
    });
  });

  it("handles same fromIndex and toIndex (no-op)", () => {
    const sections = makeSections();
    const result = reorderSections(sections, 2, 2);

    expect(result.map((s) => s.id)).toEqual(sections.map((s) => s.id));
    // startBar should remain consistent
    let bar = 0;
    for (const s of result) {
      expect(s.startBar).toBe(bar);
      bar += s.lengthBars;
    }
  });

  it("moves last to first", () => {
    const sections = makeSections();
    const result = reorderSections(sections, 4, 0);

    expect(result[0].id).toBe("outro");
    expect(result[0].startBar).toBe(0);
    expect(result[0].sortOrder).toBe(0);
  });

  it("moves first to last", () => {
    const sections = makeSections();
    const result = reorderSections(sections, 0, 4);

    expect(result[4].id).toBe("intro");
    expect(result[4].sortOrder).toBe(4);
  });

  it("works with a single section", () => {
    const sections = [makeSections()[0]];
    const result = reorderSections(sections, 0, 0);
    expect(result).toHaveLength(1);
    expect(result[0].startBar).toBe(0);
    expect(result[0].sortOrder).toBe(0);
  });

  it("works with two sections", () => {
    const sections = makeSections().slice(0, 2);
    const result = reorderSections(sections, 0, 1);

    expect(result[0].id).toBe("verse1");
    expect(result[1].id).toBe("intro");
    expect(result[0].startBar).toBe(0);
    expect(result[1].startBar).toBe(8);
  });

  it("preserves other section properties", () => {
    const sections = makeSections();
    const result = reorderSections(sections, 0, 2);

    const movedSection = result.find((s) => s.id === "intro")!;
    expect(movedSection.type).toBe("intro");
    expect(movedSection.name).toBe("Intro");
    expect(movedSection.lengthBars).toBe(4);
    expect(movedSection.sessionId).toBe("session-1");
  });
});
