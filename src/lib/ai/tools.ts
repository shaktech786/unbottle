import type Anthropic from "@anthropic-ai/sdk";

/**
 * Claude tool definitions for the AI producer.
 * These let the AI directly manipulate the workspace instead of
 * just describing what should happen.
 */

export const PRODUCER_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "generate_arrangement",
    description:
      "Generate a song arrangement with sections and chord progressions. Use this whenever the user asks for chords, an arrangement, a song structure, or says 'pick for me'. Always use this tool rather than describing chords in text.",
    input_schema: {
      type: "object" as const,
      properties: {
        sections: {
          type: "array",
          description: "Array of song sections to create",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Section name (e.g. 'Intro', 'Verse 1', 'Chorus')",
              },
              type: {
                type: "string",
                enum: [
                  "intro",
                  "verse",
                  "pre_chorus",
                  "chorus",
                  "bridge",
                  "outro",
                  "breakdown",
                  "custom",
                ],
                description: "Section type",
              },
              lengthBars: {
                type: "number",
                description: "Length in bars (typically 4 or 8)",
              },
              chordProgression: {
                type: "array",
                description: "Chord progression for this section",
                items: {
                  type: "object",
                  properties: {
                    chord: {
                      type: "object",
                      properties: {
                        root: {
                          type: "string",
                          enum: [
                            "C", "C#", "D", "D#", "E", "F",
                            "F#", "G", "G#", "A", "A#", "B",
                          ],
                        },
                        quality: {
                          type: "string",
                          enum: [
                            "major", "minor", "diminished", "augmented",
                            "dominant7", "major7", "minor7", "sus2",
                            "sus4", "add9", "power",
                          ],
                        },
                        bass: {
                          type: "string",
                          enum: [
                            "C", "C#", "D", "D#", "E", "F",
                            "F#", "G", "G#", "A", "A#", "B",
                          ],
                          description: "Optional bass note for slash chords",
                        },
                      },
                      required: ["root", "quality"],
                    },
                    durationBars: {
                      type: "number",
                      description: "How many bars this chord lasts",
                    },
                  },
                  required: ["chord", "durationBars"],
                },
              },
            },
            required: ["name", "type", "lengthBars", "chordProgression"],
          },
        },
        key: {
          type: "string",
          description: "Key signature for the song (e.g. 'C major', 'A minor')",
        },
        bpm: {
          type: "number",
          description: "Tempo in BPM",
        },
      },
      required: ["sections"],
    },
  },
  {
    name: "update_session",
    description:
      "Update session parameters like BPM, key signature, genre, or mood. Use this when the user wants to change the tempo, key, or vibe.",
    input_schema: {
      type: "object" as const,
      properties: {
        bpm: { type: "number", description: "New BPM (tempo)" },
        keySignature: { type: "string", description: "New key signature" },
        genre: { type: "string", description: "Genre label" },
        mood: { type: "string", description: "Mood/vibe label" },
      },
    },
  },
];

export interface ToolResult {
  toolName: string;
  toolInput: Record<string, unknown>;
}
