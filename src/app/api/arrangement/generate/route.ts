import { generateCompletion, getUserApiKey } from "@/lib/ai/claude";
import { buildArrangementPrompt } from "@/lib/ai/prompts/arrangement";
import type { Section, ChordEvent, SectionType } from "@/lib/music/types";

export const dynamic = "force-dynamic";

interface GenerateRequestBody {
  prompt: string;
  key?: string;
  genre?: string;
  mood?: string;
  existingSections?: Section[];
}

interface RawSection {
  name?: string;
  type?: string;
  lengthBars?: number;
  chordProgression?: RawChordEvent[];
}

interface RawChordEvent {
  chord?: {
    root?: string;
    quality?: string;
    bass?: string;
  };
  durationBars?: number;
}

const VALID_SECTION_TYPES: SectionType[] = [
  "intro",
  "verse",
  "pre_chorus",
  "chorus",
  "bridge",
  "outro",
  "breakdown",
  "custom",
];

const VALID_QUALITIES = [
  "major",
  "minor",
  "diminished",
  "augmented",
  "dominant7",
  "major7",
  "minor7",
  "sus2",
  "sus4",
  "add9",
  "power",
] as const;

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequestBody;
    const { prompt } = body;

    if (!prompt?.trim()) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const systemPrompt = buildArrangementPrompt({
      prompt,
      key: body.key,
      genre: body.genre,
      mood: body.mood,
      existingSections: body.existingSections,
    });

    const userApiKey = getUserApiKey(request);

    const rawResponse = await generateCompletion(
      systemPrompt,
      prompt,
      4096,
      userApiKey,
    );

    // Strip any markdown code fences the model may have added
    const cleaned = rawResponse
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    let parsed: { sections?: RawSection[]; suggestions?: string[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 502 },
      );
    }

    // Validate and transform sections
    const sections: Omit<Section, "id" | "sessionId">[] = (
      parsed.sections ?? []
    ).map((raw, index) => {
      const sectionType = VALID_SECTION_TYPES.includes(raw.type as SectionType)
        ? (raw.type as SectionType)
        : "custom";

      const chordProgression: ChordEvent[] = (raw.chordProgression ?? [])
        .filter(
          (ce): ce is Required<Pick<RawChordEvent, "chord" | "durationBars">> & RawChordEvent =>
            !!ce.chord?.root && !!ce.chord?.quality,
        )
        .map((ce) => ({
          chord: {
            root: ce.chord!.root as ChordEvent["chord"]["root"],
            quality: VALID_QUALITIES.includes(
              ce.chord!.quality as (typeof VALID_QUALITIES)[number],
            )
              ? (ce.chord!.quality as ChordEvent["chord"]["quality"])
              : "major",
            ...(ce.chord!.bass
              ? { bass: ce.chord!.bass as ChordEvent["chord"]["root"] }
              : {}),
          },
          durationBars: ce.durationBars ?? 1,
        }));

      return {
        name: raw.name ?? `Section ${index + 1}`,
        type: sectionType,
        startBar: 0, // Caller will compute based on layout
        lengthBars: raw.lengthBars ?? 4,
        chordProgression,
        sortOrder: index,
        color: SECTION_COLORS[sectionType],
      };
    });

    // Compute startBar sequentially
    let currentBar = 0;
    const sectionsWithStart = sections.map((section) => {
      const withStart = { ...section, startBar: currentBar };
      currentBar += section.lengthBars;
      return withStart;
    });

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0,
        )
      : [];

    return Response.json({ sections: sectionsWithStart, suggestions });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
