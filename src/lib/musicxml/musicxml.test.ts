import { describe, it, expect } from "vitest";
import { exportToMusicXML } from "./writer";
import { parseMusicXML } from "./parser";
import type { Note, Track } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "t1",
    sessionId: "s1",
    name: "Piano",
    instrument: "piano",
    volume: 1,
    pan: 0,
    muted: false,
    solo: false,
    color: "#6366f1",
    sortOrder: 0,
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> & Pick<Note, "pitch" | "startTick" | "durationTicks">): Note {
  return {
    id: "n" + Math.random().toString(36).slice(2, 8),
    trackId: "t1",
    velocity: 80,
    ...overrides,
  };
}

describe("MusicXML writer", () => {
  it("produces a well-formed XML document with header and root element", () => {
    const xml = exportToMusicXML([makeTrack()], [], 120);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("score-partwise");
    expect(xml).toContain("</score-partwise>");
  });

  it("escapes XML special characters in track names", () => {
    const xml = exportToMusicXML(
      [makeTrack({ name: 'Lead & "Bass" <Synth>' })],
      [],
      120,
    );
    expect(xml).toContain("Lead &amp; &quot;Bass&quot; &lt;Synth&gt;");
    expect(xml).not.toContain('Lead & "Bass" <Synth>');
  });

  it("writes the requested tempo", () => {
    const xml = exportToMusicXML([makeTrack()], [], 144);
    expect(xml).toContain("<per-minute>144</per-minute>");
    expect(xml).toContain('tempo="144"');
  });

  it("writes the requested key signature as fifths", () => {
    const xml = exportToMusicXML([makeTrack()], [], 120, { keySignature: "G major" });
    expect(xml).toContain("<fifths>1</fifths>");
    expect(xml).toContain("<mode>major</mode>");
  });

  it("writes minor key signatures correctly", () => {
    const xml = exportToMusicXML([makeTrack()], [], 120, { keySignature: "A minor" });
    expect(xml).toContain("<fifths>0</fifths>");
    expect(xml).toContain("<mode>minor</mode>");
  });

  it("writes time signature", () => {
    const xml = exportToMusicXML([makeTrack()], [], 120, { timeSignature: "3/4" });
    expect(xml).toContain("<beats>3</beats>");
    expect(xml).toContain("<beat-type>4</beat-type>");
  });

  it("uses bass clef for bass instruments", () => {
    const xml = exportToMusicXML(
      [makeTrack({ instrument: "bass_electric" })],
      [makeNote({ pitch: "E2", startTick: 0, durationTicks: PPQ })],
      120,
    );
    expect(xml).toContain("<sign>F</sign>");
    expect(xml).toContain("<line>4</line>");
  });

  it("uses treble clef for piano with high notes", () => {
    const xml = exportToMusicXML(
      [makeTrack({ instrument: "piano" })],
      [makeNote({ pitch: "C5", startTick: 0, durationTicks: PPQ })],
      120,
    );
    expect(xml).toContain("<sign>G</sign>");
    expect(xml).toContain("<line>2</line>");
  });

  it("emits a quarter note for a single PPQ-length C4", () => {
    const xml = exportToMusicXML(
      [makeTrack()],
      [makeNote({ pitch: "C4", startTick: 0, durationTicks: PPQ })],
      120,
    );
    expect(xml).toContain("<step>C</step>");
    expect(xml).toContain("<octave>4</octave>");
    expect(xml).toContain("<type>quarter</type>");
  });

  it("emits sharp alter for sharp pitches", () => {
    const xml = exportToMusicXML(
      [makeTrack()],
      [makeNote({ pitch: "F#4", startTick: 0, durationTicks: PPQ })],
      120,
    );
    expect(xml).toContain("<step>F</step>");
    expect(xml).toContain("<alter>1</alter>");
  });

  it("marks chord notes with <chord/>", () => {
    const xml = exportToMusicXML(
      [makeTrack()],
      [
        makeNote({ pitch: "C4", startTick: 0, durationTicks: PPQ }),
        makeNote({ pitch: "E4", startTick: 0, durationTicks: PPQ }),
        makeNote({ pitch: "G4", startTick: 0, durationTicks: PPQ }),
      ],
      120,
    );
    const chordCount = (xml.match(/<chord\/>/g) ?? []).length;
    expect(chordCount).toBe(2); // first note is the chord root, the other 2 are marked
  });

  it("creates measures based on note count and time signature", () => {
    // 8 quarters in 4/4 = 2 measures
    const notes: Note[] = [];
    for (let i = 0; i < 8; i++) {
      notes.push(makeNote({ pitch: "C4", startTick: i * PPQ, durationTicks: PPQ }));
    }
    const xml = exportToMusicXML([makeTrack()], notes, 120);
    const measureCount = (xml.match(/<measure number=/g) ?? []).length;
    expect(measureCount).toBe(2);
  });

  it("ties a note that crosses a measure boundary", () => {
    // half note starting on beat 4 of measure 1 spans into measure 2
    const xml = exportToMusicXML(
      [makeTrack()],
      [makeNote({ pitch: "C4", startTick: 3 * PPQ, durationTicks: 2 * PPQ })],
      120,
    );
    expect(xml).toContain('<tie type="start"/>');
    expect(xml).toContain('<tie type="stop"/>');
    expect(xml).toContain('<tied type="start"/>');
    expect(xml).toContain('<tied type="stop"/>');
  });

  it("fills a measure with rests when there are no notes", () => {
    const xml = exportToMusicXML([makeTrack()], [], 120);
    expect(xml).toContain("<rest/>");
  });
});

describe("MusicXML parser", () => {
  it("parses tempo from a simple file", () => {
    const xml = exportToMusicXML([makeTrack()], [], 132);
    const result = parseMusicXML(xml);
    expect(result.bpm).toBe(132);
  });

  it("parses key signature", () => {
    const xml = exportToMusicXML([makeTrack()], [], 120, { keySignature: "D major" });
    const result = parseMusicXML(xml);
    expect(result.keySignature).toBe("D major");
  });

  it("parses time signature", () => {
    const xml = exportToMusicXML([makeTrack()], [], 120, { timeSignature: "3/4" });
    const result = parseMusicXML(xml);
    expect(result.timeSignature).toBe("3/4");
  });

  it("parses title from work-title", () => {
    const xml = exportToMusicXML([makeTrack()], [], 120, { title: "My Song" });
    const result = parseMusicXML(xml);
    expect(result.title).toBe("My Song");
  });

  it("creates one track per part", () => {
    const xml = exportToMusicXML(
      [
        makeTrack({ id: "t1", name: "Piano", instrument: "piano" }),
        makeTrack({ id: "t2", name: "Bass", instrument: "bass_electric", sortOrder: 1 }),
      ],
      [],
      120,
    );
    const result = parseMusicXML(xml);
    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0].instrument).toBe("piano");
    expect(result.tracks[1].instrument).toBe("bass_electric");
  });

  it("parses a single quarter note correctly", () => {
    const track = makeTrack();
    const xml = exportToMusicXML(
      [track],
      [makeNote({ pitch: "C4", startTick: 0, durationTicks: PPQ })],
      120,
    );
    const result = parseMusicXML(xml);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].pitch).toBe("C4");
    expect(result.notes[0].durationTicks).toBe(PPQ);
    expect(result.notes[0].startTick).toBe(0);
  });

  it("parses sharp pitches", () => {
    const track = makeTrack();
    const xml = exportToMusicXML(
      [track],
      [makeNote({ pitch: "F#4", startTick: 0, durationTicks: PPQ })],
      120,
    );
    const result = parseMusicXML(xml);
    expect(result.notes[0].pitch).toBe("F#4");
  });
});

describe("MusicXML round-trip", () => {
  it("preserves a simple C major scale", () => {
    const track = makeTrack();
    const scale = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"] as const;
    const inputNotes: Note[] = scale.map((p, i) =>
      makeNote({ pitch: p, startTick: i * PPQ, durationTicks: PPQ }),
    );

    const xml = exportToMusicXML([track], inputNotes, 120);
    const result = parseMusicXML(xml);

    expect(result.notes).toHaveLength(scale.length);
    for (let i = 0; i < scale.length; i++) {
      expect(result.notes[i].pitch).toBe(scale[i]);
      expect(result.notes[i].startTick).toBe(i * PPQ);
      expect(result.notes[i].durationTicks).toBe(PPQ);
    }
  });

  it("preserves a C major chord (3 simultaneous notes)", () => {
    const track = makeTrack();
    const inputNotes: Note[] = [
      makeNote({ pitch: "C4", startTick: 0, durationTicks: PPQ }),
      makeNote({ pitch: "E4", startTick: 0, durationTicks: PPQ }),
      makeNote({ pitch: "G4", startTick: 0, durationTicks: PPQ }),
    ];

    const xml = exportToMusicXML([track], inputNotes, 120);
    const result = parseMusicXML(xml);

    expect(result.notes).toHaveLength(3);
    const pitches = result.notes.map((n) => n.pitch).sort();
    expect(pitches).toEqual(["C4", "E4", "G4"]);
    expect(result.notes.every((n) => n.startTick === 0)).toBe(true);
  });

  it("preserves multiple tracks with their instruments", () => {
    const tracks: Track[] = [
      makeTrack({ id: "t1", name: "Piano", instrument: "piano", sortOrder: 0 }),
      makeTrack({ id: "t2", name: "Bass", instrument: "bass_electric", sortOrder: 1 }),
    ];
    const notes: Note[] = [
      makeNote({ trackId: "t1", pitch: "C5", startTick: 0, durationTicks: PPQ }),
      makeNote({ trackId: "t2", pitch: "C2", startTick: 0, durationTicks: PPQ }),
    ];

    const xml = exportToMusicXML(tracks, notes, 120);
    const result = parseMusicXML(xml);

    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0].instrument).toBe("piano");
    expect(result.tracks[1].instrument).toBe("bass_electric");
    expect(result.notes).toHaveLength(2);
  });

  it("preserves a half note tied across a measure boundary", () => {
    const track = makeTrack();
    // half note starts on beat 4, extends 2 quarters into next measure
    const inputNotes: Note[] = [
      makeNote({ pitch: "C4", startTick: 3 * PPQ, durationTicks: 2 * PPQ }),
    ];

    const xml = exportToMusicXML([track], inputNotes, 120);
    const result = parseMusicXML(xml);

    // Tied notes should re-merge into a single note
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].pitch).toBe("C4");
    expect(result.notes[0].startTick).toBe(3 * PPQ);
    expect(result.notes[0].durationTicks).toBe(2 * PPQ);
  });

  it("places dynamics inside notations (schema-valid location)", () => {
    const xml = exportToMusicXML(
      [makeTrack()],
      [makeNote({ pitch: "C4", startTick: 0, durationTicks: PPQ, velocity: 100 })],
      120,
    );
    // dynamics must be inside notations, never as direct child of note
    expect(xml).toMatch(/<notations>[\s\S]*<dynamics>[\s\S]*<\/dynamics>[\s\S]*<\/notations>/);
    // and must NOT appear as a direct sibling of <type> (the old broken layout)
    expect(xml).not.toMatch(/<dot\/>\s*<dynamics>/);
    expect(xml).not.toMatch(/<type>[a-z0-9]+<\/type>\s*<dynamics>/);
  });

  it("round-trips velocity within rounding tolerance", () => {
    const xml = exportToMusicXML(
      [makeTrack()],
      [makeNote({ pitch: "C4", startTick: 0, durationTicks: PPQ, velocity: 100 })],
      120,
    );
    const result = parseMusicXML(xml);
    // velocity → percent (round) → percent → velocity (round). Allow ±2 ticks of drift.
    expect(Math.abs(result.notes[0].velocity - 100)).toBeLessThanOrEqual(2);
  });

  it("preserves bpm and key signature on round trip", () => {
    const xml = exportToMusicXML([makeTrack()], [], 96, {
      keySignature: "Bb major",
      timeSignature: "6/8",
    });
    const result = parseMusicXML(xml);
    expect(result.bpm).toBe(96);
    expect(result.keySignature).toBe("Bb major");
    expect(result.timeSignature).toBe("6/8");
  });
});
