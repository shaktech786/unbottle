/**
 * AudioContext node graph architecture (MAIN-162)
 *
 * Audio graph design — low-level node factories.
 *
 * Signal flow:
 *
 *   [Instrument source]
 *         │
 *   [GainNode: channel fader]  ← volume (0-1 linear)
 *         │
 *   [StereoPannerNode]         ← pan (-1 to +1)
 *         │
 *   [GainNode: send level]─────────────────────────────┐
 *         │                                             │
 *   [GainNode: channel output]                  [GainNode: send bus input]
 *         │                                             │
 *   [GainNode: master fader]               [EffectsChain on send bus]
 *         │                                             │
 *   [DynamicsCompressorNode: brickwall limiter]←────────┘
 *         │
 *   [AudioContext.destination]
 *
 * These functions create and wire Web Audio nodes into standard channel-strip
 * and bus topologies. They are pure factories: no global state, no singletons.
 * Tests use OfflineAudioContext; live code uses AudioContext.
 */

export interface ChannelNodes {
  /** Pre-fader gain (receives source audio) */
  fader: GainNode;
  /** Stereo panner post-fader */
  panner: StereoPannerNode;
  /** Per-channel send level to aux buses */
  sendLevel: GainNode;
  /** Final output node — connects to master fader */
  output: GainNode;
}

export interface MasterBus {
  fader: GainNode;
  /** Brickwall limiter protecting the output */
  limiter: DynamicsCompressorNode;
}

/** @deprecated Use MasterBus */
export type MasterBusNodes = MasterBus;

export interface SendBus {
  input: GainNode;
  output: GainNode;
}

/** @deprecated Use SendBus */
export type SendBusNodes = SendBus;

export interface AudioGraph {
  context: AudioContext;
  master: MasterBus;
  channels: Map<string, ChannelNodes>;
  sendBuses: Map<string, SendBus>;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export function createChannelNodes(ctx: AudioContext): ChannelNodes {
  const fader = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const sendLevel = ctx.createGain();
  sendLevel.gain.value = 0;
  const output = ctx.createGain();

  fader.connect(panner);
  panner.connect(output);
  // Send taps off the fader (pre-panner)
  fader.connect(sendLevel);

  return { fader, panner, sendLevel, output };
}

export function createMasterBus(ctx: AudioContext): MasterBus {
  const fader = ctx.createGain();
  fader.gain.value = 1;

  const limiter = ctx.createDynamicsCompressor();

  // Brickwall limiter settings
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;

  fader.connect(limiter);
  limiter.connect(ctx.destination);

  return { fader, limiter };
}

export function createSendBus(ctx: AudioContext): SendBus {
  const input = ctx.createGain();
  const output = ctx.createGain();
  input.connect(output);
  return { input, output };
}

export function buildAudioGraph(ctx: AudioContext): AudioGraph {
  const master = createMasterBus(ctx);
  return {
    context: ctx,
    master,
    channels: new Map(),
    sendBuses: new Map(),
  };
}
