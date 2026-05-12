/**
 * MixerNode — stateful multi-channel mixer built on top of graph-design factories.
 *
 * Manages a set of channel strips and aux send buses, all routed into a shared
 * master bus. Exposes a clean imperative API so React components don't have to
 * manage Web Audio nodes directly.
 */

import {
  buildAudioGraph,
  createChannelNodes,
  createSendBus,
  type AudioGraph,
  type ChannelNodes,
} from "./graph-design";

export class MixerNode {
  readonly graph: AudioGraph;
  /** Track which channels are soloed (by id) */
  private _soloedChannels = new Set<string>();

  constructor(ctx: AudioContext) {
    this.graph = buildAudioGraph(ctx);
  }

  // ---------------------------------------------------------------------------
  // Channel management
  // ---------------------------------------------------------------------------

  addChannel(id: string): ChannelNodes {
    if (this.graph.channels.has(id)) {
      return this.graph.channels.get(id)!;
    }
    const nodes = createChannelNodes(this.graph.context);
    // Wire channel output into master fader
    nodes.output.connect(this.graph.master.fader);
    this.graph.channels.set(id, nodes);
    return nodes;
  }

  removeChannel(id: string): void {
    const nodes = this.graph.channels.get(id);
    if (!nodes) return;
    nodes.output.disconnect();
    nodes.fader.disconnect();
    nodes.panner.disconnect();
    nodes.muteGate.disconnect();
    nodes.analyser.disconnect();
    nodes.sendLevel.disconnect();
    for (const sg of nodes.sendGains.values()) {
      sg.disconnect();
    }
    this._soloedChannels.delete(id);
    this.graph.channels.delete(id);
    this._applySolo();
  }

  // ---------------------------------------------------------------------------
  // Aux send buses
  // ---------------------------------------------------------------------------

  addSendBus(name: string): void {
    if (this.graph.sendBuses.has(name)) return;
    const bus = createSendBus(this.graph.context);
    bus.output.connect(this.graph.master.fader);
    this.graph.sendBuses.set(name, bus);
  }

  /**
   * Set the send level from a channel to a named aux bus.
   * Creates a dedicated per-channel/per-bus GainNode the first time.
   */
  setSendLevel(channelId: string, busName: string, level: number): void {
    const nodes = this.graph.channels.get(channelId);
    const bus = this.graph.sendBuses.get(busName);
    if (!nodes || !bus) return;

    const clamped = Math.max(0, Math.min(1, level));

    let sendGain = nodes.sendGains.get(busName);
    if (!sendGain) {
      sendGain = this.graph.context.createGain();
      // Tap from the channel sendLevel node into the per-bus gain, then into the bus input
      nodes.sendLevel.connect(sendGain);
      sendGain.connect(bus.input);
      nodes.sendGains.set(busName, sendGain);
    }
    sendGain.gain.value = clamped;
  }

  getSendLevel(channelId: string, busName: string): number {
    const nodes = this.graph.channels.get(channelId);
    if (!nodes) return 0;
    return nodes.sendGains.get(busName)?.gain.value ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Parameter control
  // ---------------------------------------------------------------------------

  setGain(channelId: string, gain: number): void {
    const nodes = this.graph.channels.get(channelId);
    if (!nodes) return;
    nodes.fader.gain.value = Math.max(0, Math.min(2, gain));
  }

  setPan(channelId: string, pan: number): void {
    const nodes = this.graph.channels.get(channelId);
    if (!nodes) return;
    nodes.panner.pan.value = Math.max(-1, Math.min(1, pan));
  }

  setMute(channelId: string, muted: boolean): void {
    const nodes = this.graph.channels.get(channelId);
    if (!nodes) return;
    // Only mute if not soloed
    if (!this._soloedChannels.has(channelId)) {
      nodes.muteGate.gain.value = muted ? 0 : 1;
    }
    // Store muted state on the node via a custom property so solo can restore it
    (nodes as unknown as { _muted: boolean })._muted = muted;
  }

  setSolo(channelId: string, soloed: boolean): void {
    if (soloed) {
      this._soloedChannels.add(channelId);
    } else {
      this._soloedChannels.delete(channelId);
    }
    this._applySolo();
  }

  isMuted(channelId: string): boolean {
    const nodes = this.graph.channels.get(channelId);
    if (!nodes) return false;
    return (nodes as unknown as { _muted?: boolean })._muted ?? false;
  }

  isSoloed(channelId: string): boolean {
    return this._soloedChannels.has(channelId);
  }

  /** Recompute muteGate for all channels based on solo state. */
  private _applySolo(): void {
    const hasSolo = this._soloedChannels.size > 0;
    for (const [id, nodes] of this.graph.channels) {
      const muted = (nodes as unknown as { _muted?: boolean })._muted ?? false;
      if (hasSolo) {
        // Solo mode: only soloed channels pass audio
        nodes.muteGate.gain.value = this._soloedChannels.has(id) ? 1 : 0;
      } else {
        // No solo: respect per-channel mute
        nodes.muteGate.gain.value = muted ? 0 : 1;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Source routing
  // ---------------------------------------------------------------------------

  /** Connect an arbitrary AudioNode as the source for a channel. */
  connectSource(channelId: string, source: AudioNode): void {
    const nodes = this.graph.channels.get(channelId);
    if (!nodes) return;
    source.connect(nodes.fader);
  }

  /** Returns the channel's input (fader) node so callers can connect sources. */
  getChannelInputNode(channelId: string): GainNode | null {
    return this.graph.channels.get(channelId)?.fader ?? null;
  }

  /** Returns the channel's AnalyserNode for peak metering. */
  getChannelAnalyser(channelId: string): AnalyserNode | null {
    return this.graph.channels.get(channelId)?.analyser ?? null;
  }

  /** Returns the master bus AnalyserNode for peak metering. */
  getMasterAnalyser(): AnalyserNode {
    return this.graph.master.analyser;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  dispose(): void {
    for (const id of [...this.graph.channels.keys()]) {
      this.removeChannel(id);
    }
    this.graph.master.limiter.disconnect();
    this.graph.master.analyser.disconnect();
    this.graph.master.fader.disconnect();
  }
}
