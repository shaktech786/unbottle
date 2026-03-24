import type { Section, Track, ChordEvent, SectionType, InstrumentType } from "./types";

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  bpm: number;
  keySignature: string;
  timeSignature: string;
  genre: string;
  mood: string;
  sections: Omit<Section, "id" | "sessionId">[];
  tracks: Omit<Track, "id" | "sessionId">[];
}

// ── Chord helpers ──────────────────────────────────────────────

type Q = ChordEvent["chord"]["quality"];

function ce(root: string, quality: Q, durationBars: number, bass?: string): ChordEvent {
  return {
    chord: {
      root: root as ChordEvent["chord"]["root"],
      quality,
      ...(bass ? { bass: bass as ChordEvent["chord"]["root"] } : {}),
    },
    durationBars,
  };
}

// ── Section builder ────────────────────────────────────────────

const SECTION_COLORS: Record<SectionType, string> = {
  intro: "#6366f1",
  verse: "#8b5cf6",
  pre_chorus: "#a855f7",
  chorus: "#ec4899",
  bridge: "#f97316",
  outro: "#64748b",
  breakdown: "#14b8a6",
  custom: "#94a3b8",
};

interface SectionDef {
  type: SectionType;
  name: string;
  lengthBars: number;
  chordProgression: ChordEvent[];
}

function buildSections(defs: SectionDef[]): Omit<Section, "id" | "sessionId">[] {
  let startBar = 0;
  return defs.map((def, i) => {
    const section: Omit<Section, "id" | "sessionId"> = {
      name: def.name,
      type: def.type,
      startBar,
      lengthBars: def.lengthBars,
      chordProgression: def.chordProgression,
      sortOrder: i,
      color: SECTION_COLORS[def.type],
    };
    startBar += def.lengthBars;
    return section;
  });
}

// ── Track builder ──────────────────────────────────────────────

const TRACK_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b",
  "#8b5cf6", "#10b981", "#f43f5e", "#3b82f6",
];

function buildTracks(
  instruments: { name: string; instrument: InstrumentType }[],
): Omit<Track, "id" | "sessionId">[] {
  return instruments.map((t, i) => ({
    name: t.name,
    instrument: t.instrument,
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    color: TRACK_COLORS[i % TRACK_COLORS.length],
    sortOrder: i,
  }));
}

// ── Templates ──────────────────────────────────────────────────

export const SESSION_TEMPLATES: SessionTemplate[] = [
  // 1. Lo-Fi Chill — 85 BPM, Dm, 4/4
  {
    id: "lofi-chill",
    name: "Lo-Fi Chill",
    description: "Laid-back lo-fi beats with jazzy piano chords and a mellow bass line. Perfect for relaxed study sessions.",
    bpm: 85,
    keySignature: "Dm",
    timeSignature: "4/4",
    genre: "Lo-fi",
    mood: "Chill",
    sections: buildSections([
      {
        type: "intro", name: "Intro", lengthBars: 4,
        chordProgression: [ce("D", "minor7", 2), ce("G", "dominant7", 2)],
      },
      {
        type: "verse", name: "Verse 1", lengthBars: 8,
        chordProgression: [ce("D", "minor7", 2), ce("G", "dominant7", 2), ce("C", "major7", 2), ce("A", "dominant7", 2)],
      },
      {
        type: "chorus", name: "Chorus", lengthBars: 8,
        chordProgression: [ce("F", "major7", 2), ce("G", "dominant7", 2), ce("D", "minor7", 2), ce("A", "minor7", 2)],
      },
      {
        type: "verse", name: "Verse 2", lengthBars: 8,
        chordProgression: [ce("D", "minor7", 2), ce("G", "dominant7", 2), ce("C", "major7", 2), ce("A", "dominant7", 2)],
      },
      {
        type: "outro", name: "Outro", lengthBars: 4,
        chordProgression: [ce("D", "minor7", 2), ce("G", "dominant7", 2)],
      },
    ]),
    tracks: buildTracks([
      { name: "Piano", instrument: "piano" },
      { name: "Bass", instrument: "bass_electric" },
    ]),
  },

  // 2. Pop Anthem — 128 BPM, G, 4/4
  {
    id: "pop-anthem",
    name: "Pop Anthem",
    description: "Uplifting pop structure with a catchy chorus hook, guitar-driven arrangement, and full dynamic arc.",
    bpm: 128,
    keySignature: "G",
    timeSignature: "4/4",
    genre: "Pop",
    mood: "Uplifting",
    sections: buildSections([
      {
        type: "intro", name: "Intro", lengthBars: 4,
        chordProgression: [ce("G", "major", 2), ce("D", "major", 2)],
      },
      {
        type: "verse", name: "Verse 1", lengthBars: 8,
        chordProgression: [ce("G", "major", 2), ce("E", "minor", 2), ce("C", "major", 2), ce("D", "major", 2)],
      },
      {
        type: "pre_chorus", name: "Pre-Chorus 1", lengthBars: 4,
        chordProgression: [ce("C", "major", 2), ce("D", "major", 2)],
      },
      {
        type: "chorus", name: "Chorus 1", lengthBars: 8,
        chordProgression: [ce("G", "major", 2), ce("B", "minor", 2), ce("C", "major", 2), ce("D", "major", 2)],
      },
      {
        type: "verse", name: "Verse 2", lengthBars: 8,
        chordProgression: [ce("G", "major", 2), ce("E", "minor", 2), ce("C", "major", 2), ce("D", "major", 2)],
      },
      {
        type: "pre_chorus", name: "Pre-Chorus 2", lengthBars: 4,
        chordProgression: [ce("C", "major", 2), ce("D", "major", 2)],
      },
      {
        type: "chorus", name: "Chorus 2", lengthBars: 8,
        chordProgression: [ce("G", "major", 2), ce("B", "minor", 2), ce("C", "major", 2), ce("D", "major", 2)],
      },
      {
        type: "bridge", name: "Bridge", lengthBars: 4,
        chordProgression: [ce("E", "minor", 2), ce("C", "major", 2)],
      },
      {
        type: "chorus", name: "Final Chorus", lengthBars: 8,
        chordProgression: [ce("G", "major", 2), ce("B", "minor", 2), ce("C", "major", 2), ce("D", "major", 2)],
      },
      {
        type: "outro", name: "Outro", lengthBars: 4,
        chordProgression: [ce("C", "major", 2), ce("G", "major", 2)],
      },
    ]),
    tracks: buildTracks([
      { name: "Piano", instrument: "piano" },
      { name: "Acoustic Guitar", instrument: "guitar_acoustic" },
      { name: "Bass", instrument: "bass_electric" },
    ]),
  },

  // 3. Ambient Drift — 70 BPM, Am, 4/4
  {
    id: "ambient-drift",
    name: "Ambient Drift",
    description: "Ethereal pads and lush strings over slow-moving harmonic cycles. Spacious and meditative.",
    bpm: 70,
    keySignature: "Am",
    timeSignature: "4/4",
    genre: "Ambient",
    mood: "Dreamy",
    sections: buildSections([
      {
        type: "intro", name: "Intro", lengthBars: 8,
        chordProgression: [ce("A", "minor", 4), ce("F", "major", 4)],
      },
      {
        type: "verse", name: "Drift", lengthBars: 16,
        chordProgression: [ce("A", "minor", 4), ce("C", "major", 4), ce("G", "major", 4), ce("F", "major", 4)],
      },
      {
        type: "bridge", name: "Shift", lengthBars: 8,
        chordProgression: [ce("D", "minor", 4), ce("E", "minor", 4)],
      },
      {
        type: "outro", name: "Fade", lengthBars: 8,
        chordProgression: [ce("A", "minor", 4), ce("F", "major", 4)],
      },
    ]),
    tracks: buildTracks([
      { name: "Pad", instrument: "pad" },
      { name: "Strings", instrument: "strings" },
    ]),
  },

  // 4. Rock Drive — 140 BPM, E, 4/4
  {
    id: "rock-drive",
    name: "Rock Drive",
    description: "High-energy rock with power chords, driving bass, and pounding drums. Built for intensity.",
    bpm: 140,
    keySignature: "E",
    timeSignature: "4/4",
    genre: "Rock",
    mood: "Energetic",
    sections: buildSections([
      {
        type: "intro", name: "Intro", lengthBars: 4,
        chordProgression: [ce("E", "power", 2), ce("A", "power", 2)],
      },
      {
        type: "verse", name: "Verse 1", lengthBars: 8,
        chordProgression: [ce("E", "power", 2), ce("G", "power", 2), ce("A", "power", 2), ce("E", "power", 2)],
      },
      {
        type: "chorus", name: "Chorus 1", lengthBars: 8,
        chordProgression: [ce("A", "power", 2), ce("C", "power", 2), ce("D", "power", 2), ce("E", "power", 2)],
      },
      {
        type: "verse", name: "Verse 2", lengthBars: 8,
        chordProgression: [ce("E", "power", 2), ce("G", "power", 2), ce("A", "power", 2), ce("E", "power", 2)],
      },
      {
        type: "chorus", name: "Chorus 2", lengthBars: 8,
        chordProgression: [ce("A", "power", 2), ce("C", "power", 2), ce("D", "power", 2), ce("E", "power", 2)],
      },
      {
        type: "bridge", name: "Bridge", lengthBars: 8,
        chordProgression: [ce("C", "power", 2), ce("D", "power", 2), ce("A", "power", 2), ce("B", "power", 2)],
      },
      {
        type: "chorus", name: "Final Chorus", lengthBars: 8,
        chordProgression: [ce("A", "power", 2), ce("C", "power", 2), ce("D", "power", 2), ce("E", "power", 2)],
      },
      {
        type: "outro", name: "Outro", lengthBars: 4,
        chordProgression: [ce("E", "power", 2), ce("A", "power", 2)],
      },
    ]),
    tracks: buildTracks([
      { name: "Electric Guitar", instrument: "guitar_electric" },
      { name: "Bass", instrument: "bass_electric" },
      { name: "Drums", instrument: "drums" },
    ]),
  },

  // 5. Electronic Pulse — 130 BPM, Cm, 4/4
  {
    id: "electronic-pulse",
    name: "Electronic Pulse",
    description: "Driving electronic track with synth leads, deep bass, and rhythmic breakdowns. Club-ready energy.",
    bpm: 130,
    keySignature: "Cm",
    timeSignature: "4/4",
    genre: "Electronic",
    mood: "Energetic",
    sections: buildSections([
      {
        type: "intro", name: "Intro", lengthBars: 8,
        chordProgression: [ce("C", "minor", 4), ce("G", "minor", 4)],
      },
      {
        type: "breakdown", name: "Breakdown 1", lengthBars: 8,
        chordProgression: [ce("A#", "major", 4), ce("F", "minor", 4)],
      },
      {
        type: "verse", name: "Verse", lengthBars: 8,
        chordProgression: [ce("C", "minor", 2), ce("D#", "major", 2), ce("A#", "major", 2), ce("G", "minor", 2)],
      },
      {
        type: "chorus", name: "Drop", lengthBars: 8,
        chordProgression: [ce("C", "minor", 2), ce("A#", "major", 2), ce("G", "minor", 2), ce("F", "minor", 2)],
      },
      {
        type: "breakdown", name: "Breakdown 2", lengthBars: 8,
        chordProgression: [ce("A#", "major", 4), ce("F", "minor", 4)],
      },
      {
        type: "chorus", name: "Final Drop", lengthBars: 8,
        chordProgression: [ce("C", "minor", 2), ce("A#", "major", 2), ce("G", "minor", 2), ce("F", "minor", 2)],
      },
      {
        type: "outro", name: "Outro", lengthBars: 4,
        chordProgression: [ce("C", "minor", 2), ce("G", "minor", 2)],
      },
    ]),
    tracks: buildTracks([
      { name: "Synth Lead", instrument: "synth" },
      { name: "Bass Synth", instrument: "bass_synth" },
      { name: "Drums", instrument: "drums" },
    ]),
  },
];

// ── Public API ──────────────────────────────────────────────────

export function getTemplate(id: string): SessionTemplate | undefined {
  return SESSION_TEMPLATES.find((t) => t.id === id);
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  genre: string;
  bpm: number;
  keySignature: string;
  mood: string;
}

export function listTemplates(): TemplateSummary[] {
  return SESSION_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    genre: t.genre,
    bpm: t.bpm,
    keySignature: t.keySignature,
    mood: t.mood,
  }));
}
