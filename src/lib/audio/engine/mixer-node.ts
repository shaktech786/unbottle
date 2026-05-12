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

  get context(): AudioContext {
    return this.graph.context;
  }

  addChannel(id: string): ChannelNodes {
    if (this.graph.channels.has(id)) return this.graph.channels.get(id)!;
    const nodes = createChannelNodes(this.graph.context);
    nodes.output.connect(this.graph.master.fader);
    this.graph.channels.set(id, nodes);
    return nodes;
  }

  removeChannel(id: string): void {
    const nodes = this.graph.channels.get(id);
    if (!nodes) return;
    try {
      nodes.output.disconnect();
      nodes.fader.disconnect();
      nodes.panner.disconnect();
      nodes.sendLevel.disconnect();
    } catch {
      // already disconnected
    }
    this.graph.channels.delete(id);
  }

  setGain(id: string, value: number): void {
    const nodes = this.graph.channels.get(id);
    if (nodes) nodes.fader.gain.value = Math.max(0, Math.min(2, value));
  }

  setPan(id: string, value: number): void {
    const nodes = this.graph.channels.get(id);
    if (nodes) nodes.panner.pan.value = Math.max(-1, Math.min(1, value));
  }

  setSendLevel(channelId: string, busId: string, level: number): void {
    const ch = this.graph.channels.get(channelId);
    const bus = this.graph.sendBuses.get(busId);
    if (!ch || !bus) return;

    ch.sendLevel.gain.value = Math.max(0, Math.min(1, level));
    try {
      ch.sendLevel.connect(bus.input);
    } catch {
      // already connected
    }
  }

  addSendBus(id: string): void {
    if (this.graph.sendBuses.has(id)) return;
    const bus = createSendBus(this.graph.context);
    bus.output.connect(this.graph.master.fader);
    this.graph.sendBuses.set(id, bus);
  }

  connectSource(channelId: string, source: AudioNode): void {
    const nodes = this.graph.channels.get(channelId);
    if (nodes) source.connect(nodes.fader);
  }

  getChannelInputNode(channelId: string): GainNode | null {
    return this.graph.channels.get(channelId)?.fader ?? null;
  }

  dispose(): void {
    for (const [id] of this.graph.channels) {
      this.removeChannel(id);
    }
    try {
      this.graph.master.limiter.disconnect();
      this.graph.master.fader.disconnect();
    } catch {
      // ignore
    }
  }
}
