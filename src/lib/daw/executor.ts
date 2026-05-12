/**
 * Tool executor — routes MCP tool calls to real DAW state mutations.
 * Returns a structured result compatible with the Anthropic tool-result format.
 */

import type { DAWState, DAWStateSnapshot } from "./state";
import { DAW_TOOL_NAMES } from "./tools";
import type { InstrumentType } from "@/lib/music/types";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface DAWToolResult {
  success: boolean;
  /** Subset of DAW state that changed. Null on failure or no-op mutations. */
  state_delta: Partial<DAWStateSnapshot> | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Input shapes (typed for internal routing)
// ---------------------------------------------------------------------------

interface CreateTrackInput {
  name: string;
  instrument?: InstrumentType;
  volume?: number;
  color?: string;
}

interface DeleteTrackInput {
  trackId: string;
}

interface AddClipInput {
  trackId: string;
  name?: string;
  startBar: number;
  lengthBars: number;
  color?: string;
}

interface SetTempoInput {
  bpm: number;
}

interface SetVolumeInput {
  trackId: string;
  volume: number;
}

interface MuteTrackInput {
  trackId: string;
  muted?: boolean;
}

interface SoloTrackInput {
  trackId: string;
  solo?: boolean;
}

interface PlayInput {
  fromBar?: number;
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

export function executeDAWTool(
  daw: DAWState,
  toolName: string,
  params: Record<string, unknown>,
): DAWToolResult {
  if (!DAW_TOOL_NAMES.has(toolName)) {
    return {
      success: false,
      state_delta: null,
      error: `Unknown tool: "${toolName}"`,
    };
  }

  try {
    switch (toolName) {
      case "createTrack": {
        const input = params as unknown as CreateTrackInput;
        if (!input.name || typeof input.name !== "string") {
          return { success: false, state_delta: null, error: "createTrack requires a 'name' string" };
        }
        const track = daw.createTrack({
          name: input.name,
          instrument: input.instrument,
          volume: typeof input.volume === "number" ? input.volume : undefined,
          color: typeof input.color === "string" ? input.color : undefined,
        });
        return {
          success: true,
          state_delta: { tracks: [...daw.tracks] },
        };
      }

      case "deleteTrack": {
        const input = params as unknown as DeleteTrackInput;
        if (!input.trackId) {
          return { success: false, state_delta: null, error: "deleteTrack requires 'trackId'" };
        }
        const deleted = daw.deleteTrack(input.trackId);
        if (!deleted) {
          return { success: false, state_delta: null, error: `Track "${input.trackId}" not found` };
        }
        return {
          success: true,
          state_delta: { tracks: [...daw.tracks], clips: [...daw.clips] },
        };
      }

      case "addClip": {
        const input = params as unknown as AddClipInput;
        if (!input.trackId) {
          return { success: false, state_delta: null, error: "addClip requires 'trackId'" };
        }
        if (typeof input.startBar !== "number" || typeof input.lengthBars !== "number") {
          return { success: false, state_delta: null, error: "addClip requires numeric 'startBar' and 'lengthBars'" };
        }
        const clip = daw.addClip({
          trackId: input.trackId,
          name: typeof input.name === "string" ? input.name : undefined,
          startBar: input.startBar,
          lengthBars: input.lengthBars,
          color: typeof input.color === "string" ? input.color : undefined,
        });
        if (!clip) {
          return { success: false, state_delta: null, error: `Track "${input.trackId}" not found` };
        }
        return {
          success: true,
          state_delta: { clips: [...daw.clips] },
        };
      }

      case "setTempo": {
        const input = params as unknown as SetTempoInput;
        if (typeof input.bpm !== "number") {
          return { success: false, state_delta: null, error: "setTempo requires a numeric 'bpm'" };
        }
        const newBpm = daw.setTempo(input.bpm);
        return {
          success: true,
          state_delta: { bpm: newBpm },
        };
      }

      case "setVolume": {
        const input = params as unknown as SetVolumeInput;
        if (!input.trackId || typeof input.volume !== "number") {
          return { success: false, state_delta: null, error: "setVolume requires 'trackId' and numeric 'volume'" };
        }
        const track = daw.setVolume(input.trackId, input.volume);
        if (!track) {
          return { success: false, state_delta: null, error: `Track "${input.trackId}" not found` };
        }
        return {
          success: true,
          state_delta: { tracks: [...daw.tracks] },
        };
      }

      case "muteTrack": {
        const input = params as unknown as MuteTrackInput;
        if (!input.trackId) {
          return { success: false, state_delta: null, error: "muteTrack requires 'trackId'" };
        }
        const track = daw.muteTrack(
          input.trackId,
          typeof input.muted === "boolean" ? input.muted : undefined,
        );
        if (!track) {
          return { success: false, state_delta: null, error: `Track "${input.trackId}" not found` };
        }
        return {
          success: true,
          state_delta: { tracks: [...daw.tracks] },
        };
      }

      case "soloTrack": {
        const input = params as unknown as SoloTrackInput;
        if (!input.trackId) {
          return { success: false, state_delta: null, error: "soloTrack requires 'trackId'" };
        }
        const track = daw.soloTrack(
          input.trackId,
          typeof input.solo === "boolean" ? input.solo : undefined,
        );
        if (!track) {
          return { success: false, state_delta: null, error: `Track "${input.trackId}" not found` };
        }
        return {
          success: true,
          state_delta: { tracks: [...daw.tracks] },
        };
      }

      case "play": {
        const input = params as unknown as PlayInput;
        daw.play(typeof input.fromBar === "number" ? input.fromBar : undefined);
        return {
          success: true,
          state_delta: null,
        };
      }

      case "pause": {
        daw.pause();
        return {
          success: true,
          state_delta: null,
        };
      }

      case "stop": {
        daw.stopPlayback();
        return {
          success: true,
          state_delta: null,
        };
      }

      case "undo": {
        const did = daw.undo();
        if (!did) {
          return { success: false, state_delta: null, error: "Nothing to undo" };
        }
        return {
          success: true,
          state_delta: {
            tracks: [...daw.tracks],
            clips: [...daw.clips],
            bpm: daw.bpm,
          },
        };
      }

      case "redo": {
        const did = daw.redo();
        if (!did) {
          return { success: false, state_delta: null, error: "Nothing to redo" };
        }
        return {
          success: true,
          state_delta: {
            tracks: [...daw.tracks],
            clips: [...daw.clips],
            bpm: daw.bpm,
          },
        };
      }

      default:
        return { success: false, state_delta: null, error: `Unhandled tool: "${toolName}"` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, state_delta: null, error: `Tool execution error: ${message}` };
  }
}
