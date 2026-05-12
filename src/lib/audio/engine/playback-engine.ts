"use client";

import type { Note, Track } from "@/lib/music/types";
import { PPQ, ticksToSeconds } from "@/lib/music/types";
import { routeNotesToTracks } from "@/lib/audio/note-router";
import { calculateEndTick } from "@/lib/audio/playback-utils";
import { MixerNode } from "./mixer-node";

type ToneModule = typeof import("tone");

interface ScheduledNote {
  timeoutId: ReturnType<typeof setTimeout>;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTick: number;
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;
}

type StateListener = (state: PlaybackState) => void;

export class PlaybackEngine {
  private ctx: AudioContext | null = null;
  private mixer: MixerNode | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instruments = new Map<string, any>();
  private scheduledNotes: ScheduledNote[] = [];
  private startTime = 0;
  private startTick = 0;
  private bpm = 120;
  private notes: Note[] = [];
  private tracks: Track[] = [];
  private rafId = 0;
  private autoStopTimeout: ReturnType<typeof setTimeout> | null = null;
  private toneModule: ToneModule | null = null;

  private state: PlaybackState = {
    isPlaying: false,
    currentTick: 0,
    isLooping: false,
    loopStart: 0,
    loopEnd: 0,
  };

  private listeners: Set<StateListener> = new Set();

  onStateChange(fn: StateListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn({ ...this.state });
  }

  async init(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.mixer = new MixerNode(this.ctx);
    this.toneModule = await import("tone");
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) throw new Error("PlaybackEngine not initialized");
    return this.ctx;
  }

  setNotes(notes: Note[]): void {
    this.notes = notes;
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    if (this.toneModule) {
      this.toneModule.getTransport().bpm.value = bpm;
    }
  }

  async setTracks(tracks: Track[]): Promise<void> {
    this.tracks = tracks;
    if (!this.mixer || !this.toneModule) return;

    const needed = new Set(tracks.map((t) => t.id));

    for (const [id] of this.instruments) {
      if (!needed.has(id)) {
        this.mixer.removeChannel(id);
        this.instruments.delete(id);
      }
    }

    const { createInstrument } = await import("@/lib/audio/tone-setup");

    for (const track of tracks) {
      if (this.instruments.has(track.id)) continue;
      try {
        const inst = await createInstrument(track.instrument);
        this.mixer!.addChannel(track.id);
        const inputNode = this.mixer!.getChannelInputNode(track.id);
        if (inputNode) {
          // Disconnect from Tone destination, connect to our mixer
          try { inst.disconnect(); } catch { /* ignore */ }
          inst.connect({ connect: (src: AudioNode) => src.connect(inputNode) });
        }
        this.instruments.set(track.id, inst);
      } catch {
        // instrument load failure — skip
      }
    }

    // Apply volume/pan
    for (const track of tracks) {
      this.mixer!.setGain(track.id, track.muted ? 0 : track.volume);
      this.mixer!.setPan(track.id, track.pan);
    }
  }

  async play(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
    if (this.toneModule) await this.toneModule.start();

    this.clearScheduled();
    const transport = this.toneModule?.getTransport();
    if (transport) {
      transport.bpm.value = this.bpm;
      transport.PPQ = PPQ;
    }

    const routed = routeNotesToTracks(this.notes, this.tracks);
    const now = ctx.currentTime;
    this.startTime = now;
    this.startTick = this.state.currentTick;

    for (const [trackId, { notes: trackNotes }] of routed) {
      const inst = this.instruments.get(trackId);
      if (!inst) continue;

      for (const note of trackNotes) {
        if (note.startTick < this.startTick) continue;
        const offsetSec =
          ticksToSeconds(note.startTick - this.startTick, this.bpm);
        const durSec = ticksToSeconds(note.durationTicks, this.bpm);

        const tid = setTimeout(() => {
          try {
            inst.triggerAttackRelease(
              note.pitch,
              durSec,
              ctx.currentTime,
              note.velocity / 127,
            );
          } catch { /* ignore */ }
        }, offsetSec * 1000);

        this.scheduledNotes.push({ timeoutId: tid });
      }
    }

    const endTick = calculateEndTick(this.notes);
    if (endTick > this.startTick && !this.state.isLooping) {
      const endOffsetSec = ticksToSeconds(endTick - this.startTick, this.bpm);
      this.autoStopTimeout = setTimeout(() => this.stop(), endOffsetSec * 1000);
    }

    this.state = { ...this.state, isPlaying: true };
    this.emit();
    this.startRaf();
  }

  stop(): void {
    this.clearScheduled();
    if (this.autoStopTimeout !== null) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.state = { ...this.state, isPlaying: false, currentTick: 0 };
    this.emit();
  }

  setLoop(startTick: number, endTick: number): void {
    this.state = { ...this.state, isLooping: true, loopStart: startTick, loopEnd: endTick };
    this.emit();
  }

  clearLoop(): void {
    this.state = { ...this.state, isLooping: false };
    this.emit();
  }

  seekTo(tick: number): void {
    this.state = { ...this.state, currentTick: tick };
    this.startTick = tick;
    this.startTime = this.ctx?.currentTime ?? 0;
    this.emit();
  }

  private clearScheduled(): void {
    for (const { timeoutId } of this.scheduledNotes) clearTimeout(timeoutId);
    this.scheduledNotes = [];
  }

  private startRaf(): void {
    const tick = () => {
      if (!this.state.isPlaying) return;
      const elapsed = (this.ctx?.currentTime ?? 0) - this.startTime;
      const elapsedTicks = Math.floor((elapsed / 60) * this.bpm * PPQ);
      const currentTick = this.startTick + elapsedTicks;
      this.state = { ...this.state, currentTick };
      this.emit();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  dispose(): void {
    this.stop();
    this.mixer?.dispose();
    this.ctx?.close();
    this.ctx = null;
    this.mixer = null;
    this.instruments.clear();
  }
}
