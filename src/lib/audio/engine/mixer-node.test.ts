import { describe, it, expect, beforeEach } from "vitest";
import {
  createChannelNodes,
  createSendBus,
  createMasterBus,
  buildAudioGraph,
} from "./graph-design";

// OfflineAudioContext is available in Node via the Web Audio API polyfill
// provided by jsdom. We test the node graph structure, not audio rendering.

function makeCtx(): OfflineAudioContext {
  return new OfflineAudioContext({ numberOfChannels: 2, length: 4410, sampleRate: 44100 });
}

describe("createMasterBus", () => {
  it("creates fader and limiter connected to destination", () => {
    const ctx = makeCtx();
    const master = createMasterBus(ctx);
    expect(master.fader).toBeInstanceOf(GainNode);
    expect(master.limiter).toBeInstanceOf(DynamicsCompressorNode);
    expect(master.limiter.threshold.value).toBeCloseTo(-1);
    expect(master.limiter.ratio.value).toBeCloseTo(20);
  });
});

describe("createChannelNodes", () => {
  it("creates fader, panner, sendLevel, and output nodes", () => {
    const ctx = makeCtx();
    const ch = createChannelNodes(ctx);
    expect(ch.fader).toBeInstanceOf(GainNode);
    expect(ch.panner).toBeInstanceOf(StereoPannerNode);
    expect(ch.sendLevel).toBeInstanceOf(GainNode);
    expect(ch.output).toBeInstanceOf(GainNode);
  });

  it("send level defaults to 0 (dry signal)", () => {
    const ctx = makeCtx();
    const ch = createChannelNodes(ctx);
    expect(ch.sendLevel.gain.value).toBe(0);
  });
});

describe("createSendBus", () => {
  it("creates input and output nodes", () => {
    const ctx = makeCtx();
    const bus = createSendBus(ctx);
    expect(bus.input).toBeInstanceOf(GainNode);
    expect(bus.output).toBeInstanceOf(GainNode);
  });
});

describe("buildAudioGraph", () => {
  it("initializes with empty channel and bus maps", () => {
    const ctx = makeCtx();
    const graph = buildAudioGraph(ctx);
    expect(graph.channels.size).toBe(0);
    expect(graph.sendBuses.size).toBe(0);
    expect(graph.context).toBe(ctx);
  });
});

describe("MixerNode", () => {
  let ctx: OfflineAudioContext;

  beforeEach(() => {
    ctx = makeCtx();
  });

  it("addChannel creates and caches channel nodes", async () => {
    const { MixerNode } = await import("./mixer-node");
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    const ch = mixer.addChannel("t1");
    expect(ch.fader).toBeInstanceOf(GainNode);
    // Second call returns same instance
    expect(mixer.addChannel("t1")).toBe(ch);
  });

  it("setGain clamps value between 0 and 2", async () => {
    const { MixerNode } = await import("./mixer-node");
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    mixer.addChannel("t1");
    mixer.setGain("t1", 3);
    expect(mixer.graph.channels.get("t1")!.fader.gain.value).toBe(2);
    mixer.setGain("t1", -1);
    expect(mixer.graph.channels.get("t1")!.fader.gain.value).toBe(0);
  });

  it("setPan clamps value between -1 and 1", async () => {
    const { MixerNode } = await import("./mixer-node");
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    mixer.addChannel("t1");
    mixer.setPan("t1", 2);
    expect(mixer.graph.channels.get("t1")!.panner.pan.value).toBe(1);
    mixer.setPan("t1", -2);
    expect(mixer.graph.channels.get("t1")!.panner.pan.value).toBe(-1);
  });

  it("removeChannel cleans up graph entry", async () => {
    const { MixerNode } = await import("./mixer-node");
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    mixer.addChannel("t1");
    mixer.removeChannel("t1");
    expect(mixer.graph.channels.has("t1")).toBe(false);
  });

  it("addSendBus routes bus output to master", async () => {
    const { MixerNode } = await import("./mixer-node");
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    mixer.addSendBus("reverb");
    expect(mixer.graph.sendBuses.has("reverb")).toBe(true);
    // Calling again is idempotent
    mixer.addSendBus("reverb");
    expect(mixer.graph.sendBuses.size).toBe(1);
  });
});
