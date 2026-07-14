/**
 * ToneBackend — DAWBackend implementation backed by DAWState (Tone.js layer).
 * Owns the mapping from typed params → DAWState method calls → DAWToolResult.
 */

import type { DAWState } from "../state";
import type { DAWToolResult } from "../executor";
import type { DAWBackend, CreateTrackParams, DeleteTrackParams, AddClipParams, SetTempoParams, SetVolumeParams, MuteTrackParams, SoloTrackParams, PlayParams } from "../backend";

export class ToneBackend implements DAWBackend {
  constructor(private readonly daw: DAWState) {}

  async createTrack(params: CreateTrackParams): Promise<DAWToolResult> {
    if (!params.name || typeof params.name !== "string") {
      return { success: false, state_delta: null, error: "createTrack requires a 'name' string" };
    }
    this.daw.createTrack({
      name: params.name,
      instrument: params.instrument,
      volume: typeof params.volume === "number" ? params.volume : undefined,
      color: typeof params.color === "string" ? params.color : undefined,
    });
    return { success: true, state_delta: { tracks: [...this.daw.tracks] } };
  }

  async deleteTrack(params: DeleteTrackParams): Promise<DAWToolResult> {
    if (!params.trackId) {
      return { success: false, state_delta: null, error: "deleteTrack requires 'trackId'" };
    }
    const deleted = this.daw.deleteTrack(params.trackId);
    if (!deleted) {
      return { success: false, state_delta: null, error: `Track "${params.trackId}" not found` };
    }
    return { success: true, state_delta: { tracks: [...this.daw.tracks], clips: [...this.daw.clips] } };
  }

  async addClip(params: AddClipParams): Promise<DAWToolResult> {
    if (!params.trackId) {
      return { success: false, state_delta: null, error: "addClip requires 'trackId'" };
    }
    if (typeof params.startBar !== "number" || typeof params.lengthBars !== "number") {
      return { success: false, state_delta: null, error: "addClip requires numeric 'startBar' and 'lengthBars'" };
    }
    const clip = this.daw.addClip({
      trackId: params.trackId,
      name: typeof params.name === "string" ? params.name : undefined,
      startBar: params.startBar,
      lengthBars: params.lengthBars,
      color: typeof params.color === "string" ? params.color : undefined,
    });
    if (!clip) {
      return { success: false, state_delta: null, error: `Track "${params.trackId}" not found` };
    }
    return { success: true, state_delta: { clips: [...this.daw.clips] } };
  }

  async setTempo(params: SetTempoParams): Promise<DAWToolResult> {
    if (typeof params.bpm !== "number") {
      return { success: false, state_delta: null, error: "setTempo requires a numeric 'bpm'" };
    }
    const newBpm = this.daw.setTempo(params.bpm);
    return { success: true, state_delta: { bpm: newBpm } };
  }

  async setVolume(params: SetVolumeParams): Promise<DAWToolResult> {
    if (!params.trackId || typeof params.volume !== "number") {
      return { success: false, state_delta: null, error: "setVolume requires 'trackId' and numeric 'volume'" };
    }
    const track = this.daw.setVolume(params.trackId, params.volume);
    if (!track) {
      return { success: false, state_delta: null, error: `Track "${params.trackId}" not found` };
    }
    return { success: true, state_delta: { tracks: [...this.daw.tracks] } };
  }

  async muteTrack(params: MuteTrackParams): Promise<DAWToolResult> {
    if (!params.trackId) {
      return { success: false, state_delta: null, error: "muteTrack requires 'trackId'" };
    }
    const track = this.daw.muteTrack(
      params.trackId,
      typeof params.muted === "boolean" ? params.muted : undefined,
    );
    if (!track) {
      return { success: false, state_delta: null, error: `Track "${params.trackId}" not found` };
    }
    return { success: true, state_delta: { tracks: [...this.daw.tracks] } };
  }

  async soloTrack(params: SoloTrackParams): Promise<DAWToolResult> {
    if (!params.trackId) {
      return { success: false, state_delta: null, error: "soloTrack requires 'trackId'" };
    }
    const track = this.daw.soloTrack(
      params.trackId,
      typeof params.solo === "boolean" ? params.solo : undefined,
    );
    if (!track) {
      return { success: false, state_delta: null, error: `Track "${params.trackId}" not found` };
    }
    return { success: true, state_delta: { tracks: [...this.daw.tracks] } };
  }

  async play(params: PlayParams): Promise<DAWToolResult> {
    this.daw.play(typeof params.fromBar === "number" ? params.fromBar : undefined);
    return { success: true, state_delta: null };
  }

  async pause(): Promise<DAWToolResult> {
    this.daw.pause();
    return { success: true, state_delta: null };
  }

  async stop(): Promise<DAWToolResult> {
    this.daw.stopPlayback();
    return { success: true, state_delta: null };
  }

  async undo(): Promise<DAWToolResult> {
    const did = this.daw.undo();
    if (!did) {
      return { success: false, state_delta: null, error: "Nothing to undo" };
    }
    return {
      success: true,
      state_delta: { tracks: [...this.daw.tracks], clips: [...this.daw.clips], bpm: this.daw.bpm },
    };
  }

  async redo(): Promise<DAWToolResult> {
    const did = this.daw.redo();
    if (!did) {
      return { success: false, state_delta: null, error: "Nothing to redo" };
    }
    return {
      success: true,
      state_delta: { tracks: [...this.daw.tracks], clips: [...this.daw.clips], bpm: this.daw.bpm },
    };
  }
}
