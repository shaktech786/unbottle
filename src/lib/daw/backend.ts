/**
 * DAWBackend — abstract interface that executes DAW tool commands.
 * Decouples the executor routing layer from any concrete audio engine.
 */

import type { DAWToolResult } from "./executor";
import type { InstrumentType } from "@/lib/music/types";

export interface CreateTrackParams {
  name: string;
  instrument?: InstrumentType;
  volume?: number;
  color?: string;
}

export interface DeleteTrackParams {
  trackId: string;
}

export interface AddClipParams {
  trackId: string;
  name?: string;
  startBar: number;
  lengthBars: number;
  color?: string;
}

export interface SetTempoParams {
  bpm: number;
}

export interface SetVolumeParams {
  trackId: string;
  volume: number;
}

export interface MuteTrackParams {
  trackId: string;
  muted?: boolean;
}

export interface SoloTrackParams {
  trackId: string;
  solo?: boolean;
}

export interface PlayParams {
  fromBar?: number;
}

export interface DAWBackend {
  createTrack(params: CreateTrackParams): Promise<DAWToolResult>;
  deleteTrack(params: DeleteTrackParams): Promise<DAWToolResult>;
  addClip(params: AddClipParams): Promise<DAWToolResult>;
  setTempo(params: SetTempoParams): Promise<DAWToolResult>;
  setVolume(params: SetVolumeParams): Promise<DAWToolResult>;
  muteTrack(params: MuteTrackParams): Promise<DAWToolResult>;
  soloTrack(params: SoloTrackParams): Promise<DAWToolResult>;
  play(params: PlayParams): Promise<DAWToolResult>;
  pause(): Promise<DAWToolResult>;
  stop(): Promise<DAWToolResult>;
  undo(): Promise<DAWToolResult>;
  redo(): Promise<DAWToolResult>;
}
