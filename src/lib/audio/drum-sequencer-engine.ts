/**
 * DrumSequencerEngine — 16-step × 8-voice drum machine.
 *
 * Uses the Web Audio lookahead scheduler pattern:
 * a setInterval pumps events into the future, so timing is stable even
 * under UI jank. Each voice is synthesized inline (no samples required)
 * using basic oscillator/noise techniques.
 */

export const STEPS = 16;
export const VOICE_COUNT = 8;

export type DrumVoiceName =
  | "kick"
  | "snare"
  | "hihat_closed"
  | "hihat_open"
  | "clap"
  | "tom_hi"
  | "tom_lo"
  | "rim";

export const VOICE_NAMES: DrumVoiceName[] = [
  "kick",
  "snare",
  "hihat_closed",
  "hihat_open",
  "clap",
  "tom_hi",
  "tom_lo",
  "rim",
];

export type DrumGrid = boolean[][];

/** One row per voice, 16 columns per row. */
export function createEmptyGrid(): DrumGrid {
  return Array.from({ length: VOICE_COUNT }, () => new Array(STEPS).fill(false));
}

export interface DrumSequencerParams {
  bpm: number;
  /** Per-voice volume 0–1 */
  voiceVolumes: number[];
  grid: DrumGrid;
}

export const DEFAULT_DRUM_PARAMS: DrumSequencerParams = {
  bpm: 120,
  voiceVolumes: new Array(VOICE_COUNT).fill(0.8),
  grid: createEmptyGrid(),
};

// ---------------------------------------------------------------------------
// Voice synthesizers (inline, no sample files needed)
// ---------------------------------------------------------------------------

function synthKick(ctx: AudioContext, time: number, gain: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.45);
}

function synthSnare(ctx: AudioContext, time: number, gain: number): void {
  const bufSize = ctx.sampleRate * 0.2;
  const noiseBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1500;

  const g = ctx.createGain();
  g.gain.setValueAtTime(gain * 0.8, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

  noise.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  noise.start(time);
  noise.stop(time + 0.22);

  // Tonal body
  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.frequency.value = 200;
  og.gain.setValueAtTime(gain * 0.5, time);
  og.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  osc.connect(og);
  og.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.14);
}

function synthHihatClosed(ctx: AudioContext, time: number, gain: number): void {
  const bufSize = ctx.sampleRate * 0.05;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hpf = ctx.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain * 0.6, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  src.connect(hpf);
  hpf.connect(g);
  g.connect(ctx.destination);
  src.start(time);
  src.stop(time + 0.06);
}

function synthHihatOpen(ctx: AudioContext, time: number, gain: number): void {
  const bufSize = ctx.sampleRate * 0.4;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hpf = ctx.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain * 0.5, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
  src.connect(hpf);
  hpf.connect(g);
  g.connect(ctx.destination);
  src.start(time);
  src.stop(time + 0.4);
}

function synthClap(ctx: AudioContext, time: number, gain: number): void {
  // Three bursts 6ms apart
  for (let i = 0; i < 3; i++) {
    const t = time + i * 0.006;
    const bufSize = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(bpf);
    bpf.connect(g);
    g.connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.05);
  }
}

function synthTom(ctx: AudioContext, time: number, gain: number, freq: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.2);
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.3);
}

function synthRim(ctx: AudioContext, time: number, gain: number): void {
  const osc = ctx.createOscillator();
  osc.frequency.value = 1600;
  osc.type = "triangle";
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain * 0.6, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.05);
}

function triggerVoice(
  ctx: AudioContext,
  voiceIndex: number,
  time: number,
  gain: number,
): void {
  const v = VOICE_NAMES[voiceIndex];
  switch (v) {
    case "kick": synthKick(ctx, time, gain); break;
    case "snare": synthSnare(ctx, time, gain); break;
    case "hihat_closed": synthHihatClosed(ctx, time, gain); break;
    case "hihat_open": synthHihatOpen(ctx, time, gain); break;
    case "clap": synthClap(ctx, time, gain); break;
    case "tom_hi": synthTom(ctx, time, gain, 250); break;
    case "tom_lo": synthTom(ctx, time, gain, 120); break;
    case "rim": synthRim(ctx, time, gain); break;
  }
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

export class DrumSequencerEngine {
  private ctx: AudioContext;
  params: DrumSequencerParams;
  private currentStep = 0;
  private nextStepTime = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private isPlaying = false;

  onStep?: (step: number) => void;

  constructor(ctx: AudioContext, params: Partial<DrumSequencerParams> = {}) {
    this.ctx = ctx;
    this.params = {
      ...DEFAULT_DRUM_PARAMS,
      ...params,
      grid: params.grid ?? createEmptyGrid(),
      voiceVolumes: params.voiceVolumes ?? new Array(VOICE_COUNT).fill(0.8),
    };
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get step(): number {
    return this.currentStep;
  }

  updateParams(patch: Partial<DrumSequencerParams>): void {
    Object.assign(this.params, patch);
  }

  toggleStep(voiceIndex: number, stepIndex: number): void {
    this.params.grid[voiceIndex][stepIndex] =
      !this.params.grid[voiceIndex][stepIndex];
  }

  setStepValue(voiceIndex: number, stepIndex: number, value: boolean): void {
    this.params.grid[voiceIndex][stepIndex] = value;
  }

  setVoiceVolume(voiceIndex: number, volume: number): void {
    this.params.voiceVolumes[voiceIndex] = Math.max(0, Math.min(1, volume));
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime;
    this.timerId = setInterval(() => this._schedule(), LOOKAHEAD_MS);
  }

  stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
  }

  private _schedule(): void {
    const secondsPerStep =
      (60 / this.params.bpm) / 4; // 16th note = quarter / 4

    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_S) {
      this._scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += secondsPerStep;
      this.currentStep = (this.currentStep + 1) % STEPS;
    }
  }

  private _scheduleStep(step: number, time: number): void {
    this.onStep?.(step);

    for (let v = 0; v < VOICE_COUNT; v++) {
      if (this.params.grid[v][step]) {
        const gain = this.params.voiceVolumes[v] ?? 0.8;
        triggerVoice(this.ctx, v, time, gain);
      }
    }
  }

  dispose(): void {
    this.stop();
  }
}
