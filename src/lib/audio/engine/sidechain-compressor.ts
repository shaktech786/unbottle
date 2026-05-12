/**
 * SidechainCompressor — compresses an audio signal using a separate sidechain source.
 *
 * Classic use case: kick drum sidechaining the bass track so the bass ducks
 * whenever the kick hits.
 *
 * Topology:
 *   audioInput ──────────────────────────── compressor ── output
 *   sidechainInput → sidechainGain (level) ──┘
 *
 * The Web Audio DynamicsCompressorNode does not natively support an external
 * sidechain signal path (it only compresses based on its own input). We model
 * this by summing both signals at the compressor input and keeping the
 * sidechain gain adjustable. In production this is typically augmented with a
 * worklet, but for routing graph correctness this matches the expected API.
 */
export class SidechainCompressor {
  /** Connect your audio track to this node */
  readonly audioInput: GainNode;
  /** Connect the sidechain source (e.g. kick drum) to this node */
  readonly sidechainInput: GainNode;
  /** Compressed output — connect to the mixer channel or master */
  readonly output: GainNode;

  readonly compressor: DynamicsCompressorNode;
  /** Controls how much of the sidechain signal drives the compressor */
  readonly sidechainGain: GainNode;

  constructor(ctx: AudioContext) {
    this.audioInput = ctx.createGain();
    this.sidechainInput = ctx.createGain();
    this.sidechainGain = ctx.createGain();
    this.compressor = ctx.createDynamicsCompressor();
    this.output = ctx.createGain();

    // Default sidechain compressor settings (classic pumping duck)
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 3;
    this.compressor.ratio.value = 10;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Sidechain input level default: unity
    this.sidechainGain.gain.value = 1;

    // Routing: audioInput + sidechainGain → compressor → output
    this.audioInput.connect(this.compressor);
    this.sidechainInput.connect(this.sidechainGain);
    this.sidechainGain.connect(this.compressor);
    this.compressor.connect(this.output);
  }

  /**
   * Set how hard the sidechain signal drives the compressor (0–2).
   * 0 = no sidechain effect, 1 = unity, >1 = over-driven sidechain.
   */
  setSidechainLevel(level: number): void {
    this.sidechainGain.gain.value = Math.max(0, Math.min(2, level));
  }

  dispose(): void {
    this.audioInput.disconnect();
    this.sidechainInput.disconnect();
    this.sidechainGain.disconnect();
    this.compressor.disconnect();
    this.output.disconnect();
  }
}
