/**
 * AudioContext node graph architecture (MAIN-162)
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
 * Node graph types:
 */

export interface ChannelNodes {
  fader: GainNode;
  panner: StereoPannerNode;
  sendLevel: GainNode;
  output: GainNode;
}

export interface SendBusNodes {
  input: GainNode;
  output: GainNode;
}

export interface MasterBusNodes {
  fader: GainNode;
  limiter: DynamicsCompressorNode;
}

export interface AudioGraph {
  context: AudioContext;
  channels: Map<string, ChannelNodes>;
  sendBuses: Map<string, SendBusNodes>;
  master: MasterBusNodes;
}

export function createMasterBus(ctx: AudioContext): MasterBusNodes {
  const fader = ctx.createGain();
  fader.gain.value = 1;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;

  fader.connect(limiter);
  limiter.connect(ctx.destination);

  return { fader, limiter };
}

export function createChannelNodes(ctx: AudioContext): ChannelNodes {
  const fader = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const sendLevel = ctx.createGain();
  sendLevel.gain.value = 0;
  const output = ctx.createGain();

  fader.connect(panner);
  panner.connect(sendLevel);
  panner.connect(output);

  return { fader, panner, sendLevel, output };
}

export function createSendBus(ctx: AudioContext): SendBusNodes {
  const input = ctx.createGain();
  const outputNode = ctx.createGain();
  input.connect(outputNode);
  return { input, output: outputNode };
}

export function buildAudioGraph(ctx: AudioContext): AudioGraph {
  return {
    context: ctx,
    channels: new Map(),
    sendBuses: new Map(),
    master: createMasterBus(ctx),
  };
}
