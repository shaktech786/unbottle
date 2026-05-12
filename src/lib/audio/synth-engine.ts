/**
 * SubtractiveSynth — oscillator → filter → amp envelope chain.
 *
 * Pure Web Audio API, no Tone.js dependency. Designed to run in the browser
 * and to be testable with OfflineAudioContext.
 */

export type WaveformType = "sine" | "square" | "sawtooth" | "triangle";

export interface SynthParams {
  waveform: WaveformType;
  /** Filter cutoff frequency in Hz (20–20000) */
  filterCutoff: number;
  /** Filter resonance / Q factor (0.1–30) */
  filterResonance: number;
  /** Attack time in seconds */
  attack: number;
  /** Decay time in seconds */
  decay: number;
  /** Sustain level 0–1 */
  sustain: number;
  /** Release time in seconds */
  release: number;
  /** Master output gain 0–1 */
  volume: number;
}

export const DEFAULT_SYNTH_PARAMS: SynthParams = {
  waveform: "sawtooth",
  filterCutoff: 2000,
  filterResonance: 1,
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
  volume: 0.8,
};

/** Convert MIDI note number to frequency in Hz. */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface ActiveVoice {
  osc: OscillatorNode;
  ampGain: GainNode;
  releaseAt: number;
}

export class SubtractiveSynth {
  private ctx: AudioContext;
  private filter: BiquadFilterNode;
  private masterGain: GainNode;
  private voices = new Map<number, ActiveVoice>();
  params: SynthParams;

  constructor(ctx: AudioContext, params: Partial<SynthParams> = {}) {
    this.ctx = ctx;
    this.params = { ...DEFAULT_SYNTH_PARAMS, ...params };

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = this.params.filterCutoff;
    this.filter.Q.value = this.params.filterResonance;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.params.volume;

    this.filter.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);
  }

  /** Expose the output node so callers can route into a mixer. */
  get output(): GainNode {
    return this.masterGain;
  }

  updateParams(patch: Partial<SynthParams>): void {
    Object.assign(this.params, patch);
    if (patch.filterCutoff !== undefined) {
      this.filter.frequency.value = patch.filterCutoff;
    }
    if (patch.filterResonance !== undefined) {
      this.filter.Q.value = patch.filterResonance;
    }
    if (patch.volume !== undefined) {
      this.masterGain.gain.value = patch.volume;
    }
  }

  noteOn(midi: number, velocity = 100): void {
    // Stop any existing voice on this note
    this.noteOff(midi);

    const now = this.ctx.currentTime;
    const freq = midiToFreq(midi);
    const vel = velocity / 127;

    const osc = this.ctx.createOscillator();
    osc.type = this.params.waveform;
    osc.frequency.value = freq;

    const ampGain = this.ctx.createGain();
    ampGain.gain.setValueAtTime(0, now);
    ampGain.gain.linearRampToValueAtTime(
      vel * this.params.sustain,
      now + this.params.attack,
    );
    ampGain.gain.linearRampToValueAtTime(
      vel * this.params.sustain,
      now + this.params.attack + this.params.decay,
    );

    osc.connect(ampGain);
    ampGain.connect(this.filter);
    osc.start(now);

    this.voices.set(midi, { osc, ampGain, releaseAt: -1 });
  }

  noteOff(midi: number): void {
    const voice = this.voices.get(midi);
    if (!voice) return;

    const now = this.ctx.currentTime;
    voice.ampGain.gain.cancelScheduledValues(now);
    voice.ampGain.gain.setValueAtTime(voice.ampGain.gain.value, now);
    voice.ampGain.gain.linearRampToValueAtTime(0, now + this.params.release);
    voice.osc.stop(now + this.params.release + 0.01);
    this.voices.delete(midi);
  }

  /** Trigger a note for a fixed duration (seconds), then release. */
  triggerNote(midi: number, durationSeconds: number, startTime: number, velocity = 100): void {
    const freq = midiToFreq(midi);
    const vel = velocity / 127;

    const osc = this.ctx.createOscillator();
    osc.type = this.params.waveform;
    osc.frequency.value = freq;

    const ampGain = this.ctx.createGain();
    const t0 = startTime;
    const t1 = t0 + this.params.attack;
    const t2 = t1 + this.params.decay;
    const tOff = t0 + durationSeconds;
    const tEnd = tOff + this.params.release + 0.01;

    ampGain.gain.setValueAtTime(0, t0);
    ampGain.gain.linearRampToValueAtTime(vel, t1);
    ampGain.gain.linearRampToValueAtTime(vel * this.params.sustain, t2);
    ampGain.gain.setValueAtTime(vel * this.params.sustain, tOff);
    ampGain.gain.linearRampToValueAtTime(0, tOff + this.params.release);

    osc.connect(ampGain);
    ampGain.connect(this.filter);
    osc.start(t0);
    osc.stop(tEnd);
  }

  dispose(): void {
    for (const [midi] of this.voices) {
      this.noteOff(midi);
    }
    this.filter.disconnect();
    this.masterGain.disconnect();
  }
}
