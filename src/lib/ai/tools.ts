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
  {
    name: "add_track",
    description:
      "Add a new instrument track to the session. Use this when the user wants to add an instrument, or when you're building out the arrangement and need more tracks.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Track name (e.g. 'Lead Synth', 'Bass', 'Rhythm Guitar')",
        },
        instrument: {
          type: "string",
          enum: [
            "piano", "electric_piano", "bass_electric", "bass_synth",
            "guitar_acoustic", "guitar_electric", "strings", "pad",
            "organ", "brass", "flute", "saxophone", "drums", "synth",
          ],
          description: "Instrument type for the track",
        },
      },
      required: ["name", "instrument"],
    },
  },
  {
    name: "generate_notation",
    description:
      "Generate musical notation as individual notes that appear in the piano roll and sheet music. Use this when the user asks for a melody, bass line, riff, motif, or any specific musical phrase. Notes will be rendered as both piano roll entries and sheet music notation. Always specify which track the notes should go on.",
    input_schema: {
      type: "object" as const,
      properties: {
        trackName: {
          type: "string",
          description: "Name of the track these notes belong to (e.g. 'Lead Melody', 'Bass'). Must match an existing track name.",
        },
        notes: {
          type: "array",
          description: "Array of notes to add to the sequencer",
          items: {
            type: "object",
            properties: {
              pitch: {
                type: "string",
                description: "Note pitch in format NoteName+Octave (e.g. 'C4', 'F#5', 'Bb3'). Use sharps (#) not flats.",
              },
              startBeat: {
                type: "number",
                description: "Start position in beats from the beginning (beat 1 = start). E.g., 1.0 is the first beat, 1.5 is the 'and' of beat 1, 2.0 is beat 2.",
              },
              durationBeats: {
                type: "number",
                description: "Duration in beats. E.g., 1.0 = quarter note, 0.5 = eighth note, 2.0 = half note, 4.0 = whole note.",
              },
              velocity: {
                type: "number",
                description: "Velocity/dynamics 0-127. Default 80. Use lower for soft passages, higher for accents.",
              },
            },
            required: ["pitch", "startBeat", "durationBeats"],
          },
        },
        description: {
          type: "string",
          description: "Brief description of what this notation represents (e.g. 'ascending C major melody', '12-bar blues bass line')",
        },
      },
      required: ["trackName", "notes"],
    },
  },
  {
    name: "suggest_lyrics",
    description:
      "Suggest lyrics or vocal melodies for a section. Use this when the user asks for lyrics, words, vocal ideas, or wants help writing a song's text.",
    input_schema: {
      type: "object" as const,
      properties: {
        sectionName: {
          type: "string",
          description: "Which section these lyrics are for (e.g. 'Verse 1', 'Chorus')",
        },
        lyrics: {
          type: "string",
          description: "The suggested lyrics, with line breaks",
        },
        vocalMelodyHint: {
          type: "string",
          description: "Brief description of the vocal melody contour (e.g. 'rising in the verse, descending in the chorus')",
        },
      },
      required: ["sectionName", "lyrics"],
    },
  },
];

export interface ToolResult {
  toolName: string;
  toolInput: Record<string, unknown>;
}
