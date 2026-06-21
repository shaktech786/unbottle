/**
 * ReaperBackend — DAWBackend implementation that talks to the local Reaper bridge
 * via JSON-RPC 2.0. The bridge server (unbottle-bridge.lua) must be running in Reaper.
 */

import type { DAWToolResult } from "../executor";
import type {
  DAWBackend,
  CreateTrackParams,
  DeleteTrackParams,
  AddClipParams,
  SetTempoParams,
  SetVolumeParams,
  MuteTrackParams,
  SoloTrackParams,
  PlayParams,
} from "../backend";

export class ReaperBridgeError extends Error {
  constructor(
    message: string,
    public readonly code: number,
  ) {
    super(message);
    this.name = "ReaperBridgeError";
  }
}

export class ReaperBackend implements DAWBackend {
  private idCounter = 0;

  constructor(
    private readonly host: string = "localhost",
    private readonly port: number = 9000,
  ) {}

  private get baseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  private nextId(): number {
    return ++this.idCounter;
  }

  private async rpc(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const url = `${this.baseUrl}/rpc`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: this.nextId(),
          method,
          params,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ReaperBridgeError(`Reaper bridge unreachable: ${msg}`, -32000);
    }

    if (!response.ok) {
      throw new ReaperBridgeError(
        `Reaper bridge returned HTTP ${response.status}`,
        response.status,
      );
    }

    const json = (await response.json()) as {
      result?: unknown;
      error?: { code: number; message: string };
    };

    if (json.error) {
      throw new ReaperBridgeError(json.error.message, json.error.code);
    }

    return json.result;
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ping`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async createTrack(params: CreateTrackParams): Promise<DAWToolResult> {
    const result = await this.rpc("createTrack", params as unknown as Record<string, unknown>);
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async deleteTrack(params: DeleteTrackParams): Promise<DAWToolResult> {
    const result = await this.rpc("deleteTrack", params as unknown as Record<string, unknown>);
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async addClip(params: AddClipParams): Promise<DAWToolResult> {
    const result = await this.rpc("addClip", params as unknown as Record<string, unknown>);
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async setTempo(params: SetTempoParams): Promise<DAWToolResult> {
    const result = await this.rpc("setTempo", params as unknown as Record<string, unknown>);
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async setVolume(params: SetVolumeParams): Promise<DAWToolResult> {
    const result = await this.rpc("setVolume", params as unknown as Record<string, unknown>);
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async muteTrack(params: MuteTrackParams): Promise<DAWToolResult> {
    const result = await this.rpc("muteTrack", params as unknown as Record<string, unknown>);
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async soloTrack(params: SoloTrackParams): Promise<DAWToolResult> {
    const result = await this.rpc("soloTrack", params as unknown as Record<string, unknown>);
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async play(params: PlayParams): Promise<DAWToolResult> {
    const result = await this.rpc("play", params as unknown as Record<string, unknown>);
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async pause(): Promise<DAWToolResult> {
    const result = await this.rpc("pause");
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async stop(): Promise<DAWToolResult> {
    const result = await this.rpc("stop");
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async undo(): Promise<DAWToolResult> {
    const result = await this.rpc("undo");
    return { success: true, state_delta: result as Record<string, unknown> };
  }

  async redo(): Promise<DAWToolResult> {
    const result = await this.rpc("redo");
    return { success: true, state_delta: result as Record<string, unknown> };
  }
}
