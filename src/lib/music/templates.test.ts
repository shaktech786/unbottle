import { describe, it, expect } from "vitest";
import { SESSION_TEMPLATES, getTemplate, listTemplates } from "./templates";
import type { SectionType, InstrumentType } from "./types";

const VALID_SECTION_TYPES: SectionType[] = [
  "intro", "verse", "pre_chorus", "chorus", "bridge", "outro", "breakdown", "custom",
];

const VALID_INSTRUMENT_TYPES: InstrumentType[] = [
  "piano", "electric_piano", "bass_electric", "bass_synth",
  "guitar_acoustic", "guitar_electric", "strings", "pad",
  "organ", "brass", "flute", "saxophone", "drums", "synth",
];

describe("SESSION_TEMPLATES", () => {
  it("has exactly 5 templates", () => {
    expect(SESSION_TEMPLATES).toHaveLength(5);
  });

  it("each template has a unique id", () => {
    const ids = SESSION_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(SESSION_TEMPLATES.length);
  });

  it("each template has non-empty name and description", () => {
    for (const t of SESSION_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it("each template has BPM within 60-200 range", () => {
    for (const t of SESSION_TEMPLATES) {
      expect(t.bpm).toBeGreaterThanOrEqual(60);
      expect(t.bpm).toBeLessThanOrEqual(200);
    }
  });

  it("each template has a valid time signature", () => {
    for (const t of SESSION_TEMPLATES) {
      expect(t.timeSignature).toMatch(/^\d+\/\d+$/);
    }
  });

  it("each template has at least one section", () => {
    for (const t of SESSION_TEMPLATES) {
      expect(t.sections.length).toBeGreaterThan(0);
    }
  });

  it("each template has at least one track", () => {
    for (const t of SESSION_TEMPLATES) {
      expect(t.tracks.length).toBeGreaterThan(0);
    }
  });

  it("all section types are valid", () => {
    for (const t of SESSION_TEMPLATES) {
      for (const s of t.sections) {
        expect(VALID_SECTION_TYPES).toContain(s.type);
      }
    }
  });

  it("all track instruments are valid", () => {
    for (const t of SESSION_TEMPLATES) {
      for (const tr of t.tracks) {
        expect(VALID_INSTRUMENT_TYPES).toContain(tr.instrument);
      }
    }
  });

  it("sections have valid chordProgressions with at least one chord per section", () => {
    for (const t of SESSION_TEMPLATES) {
      for (const s of t.sections) {
        expect(s.chordProgression.length).toBeGreaterThan(0);
        for (const ce of s.chordProgression) {
          expect(ce.chord.root).toBeTruthy();
          expect(ce.chord.quality).toBeTruthy();
          expect(ce.durationBars).toBeGreaterThan(0);
        }
      }
    }
  });

  it("sections have sequential startBar values", () => {
    for (const t of SESSION_TEMPLATES) {
      let expectedBar = 0;
      for (const s of t.sections) {
        expect(s.startBar).toBe(expectedBar);
        expectedBar += s.lengthBars;
      }
    }
  });

  it("sections have sortOrder matching their index", () => {
    for (const t of SESSION_TEMPLATES) {
      t.sections.forEach((s, i) => {
        expect(s.sortOrder).toBe(i);
      });
    }
  });
});

describe("Lo-Fi Chill template", () => {
  const t = SESSION_TEMPLATES.find((t) => t.id === "lofi-chill")!;

  it("exists", () => {
    expect(t).toBeDefined();
  });

  it("has correct BPM and key", () => {
    expect(t.bpm).toBe(85);
    expect(t.keySignature).toBe("Dm");
  });

  it("has 5 sections: intro, verse, chorus, verse, outro", () => {
    expect(t.sections.map((s) => s.type)).toEqual([
      "intro", "verse", "chorus", "verse", "outro",
    ]);
  });

  it("has correct section bar lengths", () => {
    expect(t.sections.map((s) => s.lengthBars)).toEqual([4, 8, 8, 8, 4]);
  });

  it("has piano and bass_electric tracks", () => {
    const instruments = t.tracks.map((tr) => tr.instrument);
    expect(instruments).toContain("piano");
    expect(instruments).toContain("bass_electric");
  });
});

describe("Pop Anthem template", () => {
  const t = SESSION_TEMPLATES.find((t) => t.id === "pop-anthem")!;

  it("exists", () => {
    expect(t).toBeDefined();
  });

  it("has correct BPM and key", () => {
    expect(t.bpm).toBe(128);
    expect(t.keySignature).toBe("G");
  });

  it("has 10 sections", () => {
    expect(t.sections).toHaveLength(10);
  });

  it("has piano, guitar_acoustic, and bass_electric tracks", () => {
    const instruments = t.tracks.map((tr) => tr.instrument);
    expect(instruments).toContain("piano");
    expect(instruments).toContain("guitar_acoustic");
    expect(instruments).toContain("bass_electric");
  });
});

describe("Ambient Drift template", () => {
  const t = SESSION_TEMPLATES.find((t) => t.id === "ambient-drift")!;

  it("exists", () => {
    expect(t).toBeDefined();
  });

  it("has correct BPM and key", () => {
    expect(t.bpm).toBe(70);
    expect(t.keySignature).toBe("Am");
  });

  it("has 4 sections: intro, verse, bridge, outro", () => {
    expect(t.sections.map((s) => s.type)).toEqual([
      "intro", "verse", "bridge", "outro",
    ]);
  });

  it("has pad and strings tracks", () => {
    const instruments = t.tracks.map((tr) => tr.instrument);
    expect(instruments).toContain("pad");
    expect(instruments).toContain("strings");
  });
});

describe("Rock Drive template", () => {
  const t = SESSION_TEMPLATES.find((t) => t.id === "rock-drive")!;

  it("exists", () => {
    expect(t).toBeDefined();
  });

  it("has correct BPM and key", () => {
    expect(t.bpm).toBe(140);
    expect(t.keySignature).toBe("E");
  });

  it("has guitar_electric, bass_electric, and drums tracks", () => {
    const instruments = t.tracks.map((tr) => tr.instrument);
    expect(instruments).toContain("guitar_electric");
    expect(instruments).toContain("bass_electric");
    expect(instruments).toContain("drums");
  });
});

describe("Electronic Pulse template", () => {
  const t = SESSION_TEMPLATES.find((t) => t.id === "electronic-pulse")!;

  it("exists", () => {
    expect(t).toBeDefined();
  });

  it("has correct BPM and key", () => {
    expect(t.bpm).toBe(130);
    expect(t.keySignature).toBe("Cm");
  });

  it("has 7 sections including breakdowns", () => {
    expect(t.sections).toHaveLength(7);
    const types = t.sections.map((s) => s.type);
    expect(types.filter((t) => t === "breakdown")).toHaveLength(2);
  });

  it("has synth, bass_synth, and drums tracks", () => {
    const instruments = t.tracks.map((tr) => tr.instrument);
    expect(instruments).toContain("synth");
    expect(instruments).toContain("bass_synth");
    expect(instruments).toContain("drums");
  });
});

describe("getTemplate", () => {
  it("returns template by id", () => {
    const t = getTemplate("lofi-chill");
    expect(t).toBeDefined();
    expect(t!.name).toBe("Lo-Fi Chill");
  });

  it("returns undefined for unknown id", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });
});

describe("listTemplates", () => {
  it("returns all templates as summaries", () => {
    const summaries = listTemplates();
    expect(summaries).toHaveLength(5);
    for (const s of summaries) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("genre");
      expect(s).toHaveProperty("bpm");
    }
  });
});
