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
    nodes.sendLevel.disconnect();
    this.graph.channels.delete(id);
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

  setSendLevel(channelId: string, busName: string, level: number): void {
    const nodes = this.graph.channels.get(channelId);
    const bus = this.graph.sendBuses.get(busName);
    if (!nodes || !bus) return;
    nodes.sendLevel.gain.value = Math.max(0, Math.min(1, level));
    nodes.sendLevel.connect(bus.input);
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

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  dispose(): void {
    for (const id of [...this.graph.channels.keys()]) {
      this.removeChannel(id);
    }
    this.graph.master.limiter.disconnect();
    this.graph.master.fader.disconnect();
  }
}
