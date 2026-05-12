/**
 * SamplePlayerEngine — load an audio file and map it to MIDI keys with pitch shifting.
 *
 * Uses Web Audio API directly (no Tone.js). Each noteOn creates a new
 * AudioBufferSourceNode pitched relative to the root MIDI note.
 */

export interface SamplePlayerParams {
  /** MIDI note that plays the sample at its original pitch */
  rootNote: number;
  /** Output gain 0–1 */
  volume: number;
  /** Playback loop enabled */
  loop: boolean;
}

export const DEFAULT_SAMPLE_PLAYER_PARAMS: SamplePlayerParams = {
  rootNote: 60, // Middle C
  volume: 0.9,
  loop: false,
};

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

export class SamplePlayerEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private buffer: AudioBuffer | null = null;
  private voices = new Map<number, ActiveVoice>();
  params: SamplePlayerParams;

  constructor(ctx: AudioContext, params: Partial<SamplePlayerParams> = {}) {
    this.ctx = ctx;
    this.params = { ...DEFAULT_SAMPLE_PLAYER_PARAMS, ...params };

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.params.volume;
    this.masterGain.connect(ctx.destination);
  }

  get output(): GainNode {
    return this.masterGain;
  }

  get hasBuffer(): boolean {
    return this.buffer !== null;
  }

  async loadFile(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
  }

  /** Load from an ArrayBuffer directly (useful in tests or when file is pre-read). */
  async loadArrayBuffer(ab: ArrayBuffer): Promise<void> {
    this.buffer = await this.ctx.decodeAudioData(ab);
  }

  /** Set a pre-decoded AudioBuffer (useful in tests). */
  setBuffer(buffer: AudioBuffer): void {
    this.buffer = buffer;
  }

  updateParams(patch: Partial<SamplePlayerParams>): void {
    Object.assign(this.params, patch);
    if (patch.volume !== undefined) {
      this.masterGain.gain.value = patch.volume;
    }
  }

  /** Play sample at the pitch corresponding to the given MIDI note. */
  noteOn(midi: number, velocity = 100): void {
    if (!this.buffer) return;

    this.noteOff(midi);

    const playbackRate = Math.pow(2, (midi - this.params.rootNote) / 12);
    const velGain = velocity / 127;

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = playbackRate;
    source.loop = this.params.loop;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = velGain;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(this.ctx.currentTime);

    source.onended = () => {
      this.voices.delete(midi);
    };

    this.voices.set(midi, { source, gainNode });
  }

  /** Schedule a note at a specific AudioContext time. */
  scheduleNote(midi: number, startTime: number, duration: number, velocity = 100): void {
    if (!this.buffer) return;

    const playbackRate = Math.pow(2, (midi - this.params.rootNote) / 12);
    const velGain = velocity / 127;

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = playbackRate;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = velGain;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(startTime);
    source.stop(startTime + duration);
  }

  noteOff(midi: number): void {
    const voice = this.voices.get(midi);
    if (!voice) return;
    try {
      voice.source.stop();
    } catch {
      // Already stopped
    }
    this.voices.delete(midi);
  }

  stopAll(): void {
    for (const [midi] of this.voices) {
      this.noteOff(midi);
    }
  }

  dispose(): void {
    this.stopAll();
    this.masterGain.disconnect();
  }
}
