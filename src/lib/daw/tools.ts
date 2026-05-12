import type Anthropic from "@anthropic-ai/sdk";

/**
 * MCP tool manifest for all core DAW operations.
 * Compatible with the Anthropic SDK Tool format.
 */
export const DAW_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "createTrack",
    description:
      "Create a new instrument track in the DAW. Use this to add a new track with a name and optional instrument type.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Track name, e.g. 'Bass', 'Lead Synth', 'Drums'",
        },
        instrument: {
          type: "string",
          enum: [
            "piano",
            "electric_piano",
            "bass_electric",
            "bass_synth",
            "guitar_acoustic",
            "guitar_electric",
            "strings",
            "pad",
            "organ",
            "brass",
            "flute",
            "saxophone",
            "drums",
            "synth",
          ],
          description: "Instrument type for the track. Defaults to 'synth'.",
        },
        volume: {
          type: "number",
          description: "Initial volume level 0.0–1.0. Defaults to 0.8.",
        },
        color: {
          type: "string",
          description: "Hex color for the track. Auto-assigned if omitted.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "deleteTrack",
    description: "Delete a track from the DAW by track ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        trackId: {
          type: "string",
          description: "ID of the track to delete.",
        },
      },
      required: ["trackId"],
    },
  },
  {
    name: "addClip",
    description:
      "Add an audio or MIDI clip to a track at a specific position.",
    input_schema: {
      type: "object" as const,
      properties: {
        trackId: {
          type: "string",
          description: "ID of the track to add the clip to.",
        },
        name: {
          type: "string",
          description: "Clip name/label.",
        },
        startBar: {
          type: "number",
          description: "Start position in bars (1-indexed).",
        },
        lengthBars: {
          type: "number",
          description: "Length of the clip in bars.",
        },
        color: {
          type: "string",
          description: "Optional hex color for the clip.",
        },
      },
      required: ["trackId", "startBar", "lengthBars"],
    },
  },
  {
    name: "setTempo",
    description: "Set the project tempo (BPM).",
    input_schema: {
      type: "object" as const,
      properties: {
        bpm: {
          type: "number",
          description: "Tempo in beats per minute. Valid range: 20–400.",
        },
      },
      required: ["bpm"],
    },
  },
  {
    name: "setVolume",
    description: "Set the volume of a specific track.",
    input_schema: {
      type: "object" as const,
      properties: {
        trackId: {
          type: "string",
          description: "ID of the track to adjust.",
        },
        volume: {
          type: "number",
          description: "Volume level 0.0 (silent) to 1.0 (full). Values above 1.0 are clamped.",
        },
      },
      required: ["trackId", "volume"],
    },
  },
  {
    name: "muteTrack",
    description: "Mute or unmute a track.",
    input_schema: {
      type: "object" as const,
      properties: {
        trackId: {
          type: "string",
          description: "ID of the track to mute/unmute.",
        },
        muted: {
          type: "boolean",
          description: "true to mute, false to unmute. Toggles if omitted.",
        },
      },
      required: ["trackId"],
    },
  },
  {
    name: "soloTrack",
    description: "Solo or unsolo a track.",
    input_schema: {
      type: "object" as const,
      properties: {
        trackId: {
          type: "string",
          description: "ID of the track to solo/unsolo.",
        },
        solo: {
          type: "boolean",
          description: "true to solo, false to unsolo. Toggles if omitted.",
        },
      },
      required: ["trackId"],
    },
  },
  {
    name: "play",
    description: "Start DAW playback from the current playhead position.",
    input_schema: {
      type: "object" as const,
      properties: {
        fromBar: {
          type: "number",
          description: "Optional bar to start playback from. Uses current position if omitted.",
        },
      },
    },
  },
  {
    name: "pause",
    description: "Pause DAW playback, preserving the current playhead position.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "stop",
    description: "Stop DAW playback and return the playhead to bar 1.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "undo",
    description: "Undo the last DAW state change.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "redo",
    description: "Redo the previously undone DAW state change.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
];

/** All valid DAW tool names, derived from the manifest. */
export type DAWToolName = (typeof DAW_TOOLS)[number]["name"];

export const DAW_TOOL_NAMES = new Set<string>(DAW_TOOLS.map((t) => t.name));
