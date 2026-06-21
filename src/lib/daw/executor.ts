/**
 * Tool executor — routes MCP tool calls to a DAWBackend.
 * Returns a structured result compatible with the Anthropic tool-result format.
 */

import type { DAWState, DAWStateSnapshot } from "./state";
import type { DAWBackend } from "./backend";
import { DAW_TOOL_NAMES } from "./tools";

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
// Executor
// ---------------------------------------------------------------------------

export async function executeDAWTool(
  daw: DAWState,
  backend: DAWBackend,
  toolName: string,
  params: unknown,
): Promise<DAWToolResult> {
  if (!DAW_TOOL_NAMES.has(toolName)) {
    return {
      success: false,
      state_delta: null,
      error: `Unknown tool: "${toolName}"`,
    };
  }

  const p = (params ?? {}) as Record<string, unknown>;

  try {
    switch (toolName) {
      case "createTrack":
        return await backend.createTrack({
          name: p.name as string,
          instrument: p.instrument as Parameters<typeof backend.createTrack>[0]["instrument"],
          volume: p.volume as number | undefined,
          color: p.color as string | undefined,
        });

      case "deleteTrack":
        return await backend.deleteTrack({ trackId: p.trackId as string });

      case "addClip":
        return await backend.addClip({
          trackId: p.trackId as string,
          name: p.name as string | undefined,
          startBar: p.startBar as number,
          lengthBars: p.lengthBars as number,
          color: p.color as string | undefined,
        });

      case "setTempo":
        return await backend.setTempo({ bpm: p.bpm as number });

      case "setVolume":
        return await backend.setVolume({ trackId: p.trackId as string, volume: p.volume as number });

      case "muteTrack":
        return await backend.muteTrack({ trackId: p.trackId as string, muted: p.muted as boolean | undefined });

      case "soloTrack":
        return await backend.soloTrack({ trackId: p.trackId as string, solo: p.solo as boolean | undefined });

      case "play":
        return await backend.play({ fromBar: p.fromBar as number | undefined });

      case "pause":
        return await backend.pause();

      case "stop":
        return await backend.stop();

      case "undo":
        return await backend.undo();

      case "redo":
        return await backend.redo();

      default:
        return { success: false, state_delta: null, error: `Unhandled tool: "${toolName}"` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, state_delta: null, error: `Tool execution error: ${message}` };
  }
}
