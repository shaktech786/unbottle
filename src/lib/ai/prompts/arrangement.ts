import type { Section } from "@/lib/music/types";

export function buildArrangementPrompt(options: {
  prompt: string;
  key?: string;
  genre?: string;
  mood?: string;
  existingSections?: Section[];
}): string {
  const existingSummary = options.existingSections?.length
    ? `\nExisting sections:\n${options.existingSections
        .map(
          (s) =>
            `- ${s.name} (${s.type}, ${s.lengthBars} bars, chords: ${s.chordProgression.length > 0 ? "defined" : "none"})`,
        )
        .join("\n")}`
    : "";

  return `You are a music arrangement AI for Unbottle, an AI music production companion.

## Task
Generate a song arrangement based on the user's description. Return a JSON object with sections and suggestions.

## Constraints
${options.key ? `- Key: ${options.key}` : "- Key: not specified (pick something that fits)"}
${options.genre ? `- Genre: ${options.genre}` : ""}
${options.mood ? `- Mood: ${options.mood}` : ""}
${existingSummary}

## Output Format
Return ONLY valid JSON matching this structure (no markdown, no code fences):

{
  "sections": [
    {
      "name": "Intro",
      "type": "intro",
      "lengthBars": 4,
      "chordProgression": [
        { "chord": { "root": "C", "quality": "major" }, "durationBars": 2 },
        { "chord": { "root": "G", "quality": "major" }, "durationBars": 2 }
      ]
    }
  ],
  "suggestions": [
    "Try adding a pre-chorus to build tension before the chorus",
    "Consider a key change in the bridge for contrast"
  ]
}

## Section Types
Valid types: "intro", "verse", "pre_chorus", "chorus", "bridge", "outro", "breakdown", "custom"

## Chord Qualities
Valid qualities: "major", "minor", "diminished", "augmented", "dominant7", "major7", "minor7", "sus2", "sus4", "add9", "power"

## Guidelines
- Create a complete, realistic song structure
- Chord progressions should be musically coherent in the given key
- Each section should have a clear harmonic purpose
- Suggest 2-4 next steps the musician could take
- Keep it practical and playable
- If existing sections are provided, build around them rather than replacing them

## User Request
${options.prompt}`;
}
