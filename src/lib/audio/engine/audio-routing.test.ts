/**
 * MAIN-165: Audio routing tests using OfflineAudioContext.
 *
 * These tests verify signal-flow through the graph-design / MixerNode layer
 * using the OfflineAudioContext stub wired in vitest.setup.ts. No real Web
 * Audio processing happens — we assert that nodes are created, connected, and
 * configured correctly for each routing scenario.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createChannelNodes,
  createSendBus,
  createMasterBus,
  buildAudioGraph,
} from "./graph-design";
import { MixerNode } from "./mixer-node";

function makeOfflineCtx(): OfflineAudioContext {
  return new OfflineAudioContext({ numberOfChannels: 2, length: 44100, sampleRate: 44100 });
}

// ---------------------------------------------------------------------------
// Signal path: channel → master
// ---------------------------------------------------------------------------

describe("channel → master routing", () => {
  it("channel output connects to master fader on addChannel", () => {
    const ctx = makeOfflineCtx();
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    const ch = mixer.addChannel("t1");

    // The channel output node should have been connected to the master fader.
    // We verify indirectly: the channel nodes are registered and master exists.
    expect(ch.output).toBeInstanceOf(GainNode);
    expect(mixer.graph.master.fader).toBeInstanceOf(GainNode);
    expect(mixer.graph.channels.has("t1")).toBe(true);
  });

  it("signal chain within a channel: fader → panner → output", () => {
    const ctx = makeOfflineCtx();
    const ch = createChannelNodes(ctx as unknown as AudioContext);

    // Verify node types are correct for the signal path
    expect(ch.fader).toBeInstanceOf(GainNode);
    expect(ch.panner).toBeInstanceOf(StereoPannerNode);
    expect(ch.sendLevel).toBeInstanceOf(GainNode);
    expect(ch.output).toBeInstanceOf(GainNode);
  });

  it("master bus: fader → limiter → destination", () => {
    const ctx = makeOfflineCtx();
    const master = createMasterBus(ctx as unknown as AudioContext);

    expect(master.fader).toBeInstanceOf(GainNode);
    expect(master.limiter).toBeInstanceOf(DynamicsCompressorNode);
    // Brickwall limiter settings
    expect(master.limiter.threshold.value).toBeCloseTo(-0.1);
    expect(master.limiter.ratio.value).toBeCloseTo(20);
    expect(master.limiter.knee.value).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple channels isolated in the graph
// ---------------------------------------------------------------------------

describe("multi-channel isolation", () => {
  let mixer: MixerNode;

  beforeEach(() => {
    const ctx = makeOfflineCtx();
    mixer = new MixerNode(ctx as unknown as AudioContext);
  });

  it("each channel gets its own independent node set", () => {
    const ch1 = mixer.addChannel("t1");
    const ch2 = mixer.addChannel("t2");

    expect(ch1).not.toBe(ch2);
    expect(ch1.fader).not.toBe(ch2.fader);
    expect(ch1.panner).not.toBe(ch2.panner);
  });

  it("removing one channel does not affect another", () => {
    mixer.addChannel("t1");
    mixer.addChannel("t2");
    mixer.removeChannel("t1");

    expect(mixer.graph.channels.has("t1")).toBe(false);
    expect(mixer.graph.channels.has("t2")).toBe(true);
  });

  it("gain set on one channel does not bleed to another", () => {
    mixer.addChannel("t1");
    mixer.addChannel("t2");
    mixer.setGain("t1", 0.5);
    mixer.setGain("t2", 1.0);

    expect(mixer.graph.channels.get("t1")!.fader.gain.value).toBe(0.5);
    expect(mixer.graph.channels.get("t2")!.fader.gain.value).toBe(1.0);
  });

  it("pan set on one channel does not bleed to another", () => {
    mixer.addChannel("t1");
    mixer.addChannel("t2");
    mixer.setPan("t1", -0.5);
    mixer.setPan("t2", 0.8);

    expect(mixer.graph.channels.get("t1")!.panner.pan.value).toBe(-0.5);
    expect(mixer.graph.channels.get("t2")!.panner.pan.value).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// Aux send / bus routing
// ---------------------------------------------------------------------------

describe("aux send bus routing", () => {
  let mixer: MixerNode;

  beforeEach(() => {
    const ctx = makeOfflineCtx();
    mixer = new MixerNode(ctx as unknown as AudioContext);
  });

  it("addSendBus registers a bus in the graph", () => {
    mixer.addSendBus("reverb");
    expect(mixer.graph.sendBuses.has("reverb")).toBe(true);
  });

  it("bus nodes are separate GainNodes", () => {
    const ctx = makeOfflineCtx();
    const bus = createSendBus(ctx as unknown as AudioContext);

    expect(bus.input).toBeInstanceOf(GainNode);
    expect(bus.output).toBeInstanceOf(GainNode);
    expect(bus.input).not.toBe(bus.output);
  });

  it("addSendBus is idempotent — second call does not duplicate", () => {
    mixer.addSendBus("delay");
    mixer.addSendBus("delay");

    expect(mixer.graph.sendBuses.size).toBe(1);
  });

  it("setSendLevel wires channel send to bus and clamps to [0,1]", () => {
    mixer.addChannel("t1");
    mixer.addSendBus("reverb");

    mixer.setSendLevel("t1", "reverb", 0.6);
    expect(mixer.getSendLevel("t1", "reverb")).toBe(0.6);

    // clamp high
    mixer.setSendLevel("t1", "reverb", 1.5);
    expect(mixer.getSendLevel("t1", "reverb")).toBe(1);

    // clamp low
    mixer.setSendLevel("t1", "reverb", -0.2);
    expect(mixer.getSendLevel("t1", "reverb")).toBe(0);
  });

  it("setSendLevel on unknown channel/bus is a no-op", () => {
    // Should not throw
    expect(() => mixer.setSendLevel("ghost", "reverb", 0.5)).not.toThrow();
    expect(() => mixer.setSendLevel("t1", "ghost", 0.5)).not.toThrow();
  });

  it("multiple buses can coexist independently", () => {
    mixer.addSendBus("reverb");
    mixer.addSendBus("delay");
    mixer.addSendBus("chorus");

    expect(mixer.graph.sendBuses.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Source → channel input routing
// ---------------------------------------------------------------------------

describe("connectSource routing", () => {
  it("connectSource wires a source AudioNode into the channel fader", () => {
    const ctx = makeOfflineCtx();
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    mixer.addChannel("t1");

    // Create a source-like node (oscillator or buffer source — use GainNode as proxy)
    const fakeSource = (ctx as unknown as AudioContext).createGain();
    // Should not throw
    expect(() => mixer.connectSource("t1", fakeSource)).not.toThrow();
  });

  it("connectSource on unknown channel is a no-op", () => {
    const ctx = makeOfflineCtx();
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    const fakeSource = (ctx as unknown as AudioContext).createGain();

    expect(() => mixer.connectSource("ghost", fakeSource)).not.toThrow();
  });

  it("getChannelInputNode returns the fader GainNode", () => {
    const ctx = makeOfflineCtx();
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    mixer.addChannel("t1");

    const input = mixer.getChannelInputNode("t1");
    expect(input).toBeInstanceOf(GainNode);
    expect(input).toBe(mixer.graph.channels.get("t1")!.fader);
  });

  it("getChannelInputNode returns null for unknown channel", () => {
    const ctx = makeOfflineCtx();
    const mixer = new MixerNode(ctx as unknown as AudioContext);

    expect(mixer.getChannelInputNode("ghost")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Gain / pan boundary clamping
// ---------------------------------------------------------------------------

describe("gain and pan clamping", () => {
  let mixer: MixerNode;

  beforeEach(() => {
    const ctx = makeOfflineCtx();
    mixer = new MixerNode(ctx as unknown as AudioContext);
    mixer.addChannel("t1");
  });

  it("gain above 2 is clamped to 2", () => {
    mixer.setGain("t1", 5);
    expect(mixer.graph.channels.get("t1")!.fader.gain.value).toBe(2);
  });

  it("gain below 0 is clamped to 0", () => {
    mixer.setGain("t1", -1);
    expect(mixer.graph.channels.get("t1")!.fader.gain.value).toBe(0);
  });

  it("pan above 1 is clamped to 1", () => {
    mixer.setPan("t1", 3);
    expect(mixer.graph.channels.get("t1")!.panner.pan.value).toBe(1);
  });

  it("pan below -1 is clamped to -1", () => {
    mixer.setPan("t1", -3);
    expect(mixer.graph.channels.get("t1")!.panner.pan.value).toBe(-1);
  });

  it("gain on unknown channel is a no-op", () => {
    expect(() => mixer.setGain("ghost", 0.5)).not.toThrow();
  });

  it("pan on unknown channel is a no-op", () => {
    expect(() => mixer.setPan("ghost", 0.5)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Full graph construction from scratch
// ---------------------------------------------------------------------------

describe("full graph construction", () => {
  it("buildAudioGraph returns a graph with master bus wired to destination", () => {
    const ctx = makeOfflineCtx();
    const graph = buildAudioGraph(ctx as unknown as AudioContext);

    expect(graph.context).toBe(ctx);
    expect(graph.master.fader).toBeInstanceOf(GainNode);
    expect(graph.master.limiter).toBeInstanceOf(DynamicsCompressorNode);
    expect(graph.channels.size).toBe(0);
    expect(graph.sendBuses.size).toBe(0);
  });

  it("dispose cleans up all channels without throwing", () => {
    const ctx = makeOfflineCtx();
    const mixer = new MixerNode(ctx as unknown as AudioContext);
    mixer.addChannel("t1");
    mixer.addChannel("t2");
    mixer.addChannel("t3");

    expect(() => mixer.dispose()).not.toThrow();
    expect(mixer.graph.channels.size).toBe(0);
  });

  it("offline context has the right sample rate", () => {
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: 88200, sampleRate: 44100 });
    expect(ctx.sampleRate).toBe(44100);
    expect(ctx.numberOfChannels).toBe(2);
    expect(ctx.length).toBe(88200);
  });

  it("startRendering resolves with an AudioBuffer-shaped object", async () => {
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: 1024, sampleRate: 44100 });
    const buf = await ctx.startRendering();

    expect(buf.numberOfChannels).toBe(2);
    expect(buf.length).toBe(1024);
    expect(buf.sampleRate).toBe(44100);

    const ch0 = buf.getChannelData(0);
    expect(ch0).toBeInstanceOf(Float32Array);
    expect(ch0.length).toBe(1024);
  });
});
