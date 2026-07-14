/**
 * AuxBus — configurable submix bus for send effects (Reverb, Delay, etc.).
 *
 * Each channel strip can route a portion of its signal into one or more
 * aux buses. The bus sums all incoming sends and routes to a shared output
 * (typically the master bus fader).
 *
 * Topology per channel send:
 *   channel sendLevel → perChannelSendGain → bus input (summing GainNode) → bus output
 */
export class AuxBus {
  readonly name: string;
  /** Summing node — all per-channel send gains connect here */
  readonly input: GainNode;
  /** Bus output — connect this to master or a return channel */
  readonly output: GainNode;

  private readonly ctx: AudioContext;

  constructor(ctx: AudioContext, name: string) {
    this.ctx = ctx;
    this.name = name;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.input.connect(this.output);
  }

  /** Set the overall bus return level (0–1). */
  setReturnLevel(level: number): void {
    this.output.gain.value = Math.max(0, Math.min(1, level));
  }

  dispose(): void {
    this.input.disconnect();
    this.output.disconnect();
  }
}
