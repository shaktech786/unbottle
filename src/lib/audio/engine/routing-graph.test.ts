/**
 * MAIN-175: Routing graph signal flow and bus isolation tests.
 *
 * Tests use the OfflineAudioContext stub (vitest.setup.ts) and verify that
 * node connections, gain values, and routing configuration are correct after
 * each operation. No real audio processing — we assert graph topology.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MixerNode } from "./mixer-node";
import { AuxBus } from "./aux-bus";
import { SidechainCompressor } from "./sidechain-compressor";
import { createMasterBus } from "./graph-design";

function makeCtx(): AudioContext {
  return new OfflineAudioContext({
    numberOfChannels: 2,
    length: 44100,
    sampleRate: 44100,
  }) as unknown as AudioContext;
}

// ---------------------------------------------------------------------------
// Channel fader at 0 produces silence
// ---------------------------------------------------------------------------

describe("channel fader produces silence at 0", () => {
  it("fader gain.value is 0 when setGain(0) called", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("bass");

    mixer.setGain("bass", 0);

    const nodes = mixer.graph.channels.get("bass")!;
    expect(nodes.fader.gain.value).toBe(0);
  });

  it("fader at 0 is separate from pan and output nodes", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("bass");
    mixer.setGain("bass", 0);

    const nodes = mixer.graph.channels.get("bass")!;
    // Other nodes should still have default values
    expect(nodes.panner.pan.value).toBe(0);
    expect(nodes.muteGate.gain.value).toBe(1);
    expect(nodes.output.gain.value).toBe(1);
  });

  it("multiple channels can independently be set to 0", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("bass");
    mixer.addChannel("kick");
    mixer.setGain("bass", 0);
    mixer.setGain("kick", 1.5);

    expect(mixer.graph.channels.get("bass")!.fader.gain.value).toBe(0);
    expect(mixer.graph.channels.get("kick")!.fader.gain.value).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// Mute disconnects from bus
// ---------------------------------------------------------------------------

describe("mute disconnects channel from bus", () => {
  it("muteGate gain is 0 when channel is muted", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("synth");

    mixer.setMute("synth", true);

    const nodes = mixer.graph.channels.get("synth")!;
    expect(nodes.muteGate.gain.value).toBe(0);
  });

  it("muteGate gain restores to 1 on unmute", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("synth");

    mixer.setMute("synth", true);
    mixer.setMute("synth", false);

    const nodes = mixer.graph.channels.get("synth")!;
    expect(nodes.muteGate.gain.value).toBe(1);
  });

  it("muting one channel does not mute another", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("ch1");
    mixer.addChannel("ch2");

    mixer.setMute("ch1", true);

    expect(mixer.graph.channels.get("ch1")!.muteGate.gain.value).toBe(0);
    expect(mixer.graph.channels.get("ch2")!.muteGate.gain.value).toBe(1);
  });

  it("solo overrides mute — soloed channel passes audio even when muted", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("lead");
    mixer.addChannel("pad");

    mixer.setMute("lead", true);
    mixer.setSolo("lead", true);

    // Lead is soloed so muteGate should be 1 (audio passes)
    expect(mixer.graph.channels.get("lead")!.muteGate.gain.value).toBe(1);
    // Pad is not soloed, so it gets gated out
    expect(mixer.graph.channels.get("pad")!.muteGate.gain.value).toBe(0);
  });

  it("isMuted reflects logical mute state regardless of solo", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("lead");

    mixer.setMute("lead", true);
    mixer.setSolo("lead", true);

    // Even though solo overrides the gate, isMuted still returns true
    expect(mixer.isMuted("lead")).toBe(true);
    expect(mixer.isSoloed("lead")).toBe(true);
  });

  it("clearing solo restores muted channel to silence", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("lead");
    mixer.addChannel("pad");

    mixer.setMute("lead", true);
    mixer.setSolo("lead", true);
    // lead: muteGate=1 (solo), pad: muteGate=0

    mixer.setSolo("lead", false);
    // No more solo — lead should be muted again
    expect(mixer.graph.channels.get("lead")!.muteGate.gain.value).toBe(0);
    // pad should be back to normal
    expect(mixer.graph.channels.get("pad")!.muteGate.gain.value).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Aux send level controls send amount
// ---------------------------------------------------------------------------

describe("aux send level controls send amount", () => {
  it("setSendLevel creates per-bus gain and sets correct value", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("guitar");
    mixer.addSendBus("reverb");

    mixer.setSendLevel("guitar", "reverb", 0.75);

    expect(mixer.getSendLevel("guitar", "reverb")).toBe(0.75);
  });

  it("different buses have independent send levels", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("guitar");
    mixer.addSendBus("reverb");
    mixer.addSendBus("delay");

    mixer.setSendLevel("guitar", "reverb", 0.5);
    mixer.setSendLevel("guitar", "delay", 0.3);

    expect(mixer.getSendLevel("guitar", "reverb")).toBe(0.5);
    expect(mixer.getSendLevel("guitar", "delay")).toBe(0.3);
  });

  it("send level is clamped to [0,1]", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("keys");
    mixer.addSendBus("reverb");

    mixer.setSendLevel("keys", "reverb", 2.5);
    expect(mixer.getSendLevel("keys", "reverb")).toBe(1);

    mixer.setSendLevel("keys", "reverb", -1);
    expect(mixer.getSendLevel("keys", "reverb")).toBe(0);
  });

  it("send level 0 means no signal reaches the bus", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("keys");
    mixer.addSendBus("reverb");

    mixer.setSendLevel("keys", "reverb", 0);
    expect(mixer.getSendLevel("keys", "reverb")).toBe(0);
  });

  it("AuxBus return level controls output gain", () => {
    const ctx = makeCtx();
    const bus = new AuxBus(ctx, "reverb");

    bus.setReturnLevel(0.4);
    expect(bus.output.gain.value).toBe(0.4);
  });

  it("AuxBus return level is clamped to [0,1]", () => {
    const ctx = makeCtx();
    const bus = new AuxBus(ctx, "delay");

    bus.setReturnLevel(1.5);
    expect(bus.output.gain.value).toBe(1);

    bus.setReturnLevel(-0.5);
    expect(bus.output.gain.value).toBe(0);
  });

  it("getSendLevel returns 0 for unknown channel", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    expect(mixer.getSendLevel("ghost", "reverb")).toBe(0);
  });

  it("multiple channels send to same bus independently", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("vox");
    mixer.addChannel("guitar");
    mixer.addSendBus("reverb");

    mixer.setSendLevel("vox", "reverb", 0.8);
    mixer.setSendLevel("guitar", "reverb", 0.2);

    expect(mixer.getSendLevel("vox", "reverb")).toBe(0.8);
    expect(mixer.getSendLevel("guitar", "reverb")).toBe(0.2);
  });
});

// ---------------------------------------------------------------------------
// Master brickwall limiter clamps output
// ---------------------------------------------------------------------------

describe("master brickwall limiter", () => {
  it("limiter threshold is set to -0.1 dBFS", () => {
    const ctx = makeCtx();
    const master = createMasterBus(ctx);
    expect(master.limiter.threshold.value).toBeCloseTo(-0.1);
  });

  it("limiter ratio is 20:1 (brickwall)", () => {
    const ctx = makeCtx();
    const master = createMasterBus(ctx);
    expect(master.limiter.ratio.value).toBe(20);
  });

  it("limiter knee is 0 (hard knee)", () => {
    const ctx = makeCtx();
    const master = createMasterBus(ctx);
    expect(master.limiter.knee.value).toBe(0);
  });

  it("master bus has an AnalyserNode for metering", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    const analyser = mixer.getMasterAnalyser();
    expect(analyser).toBeInstanceOf(AnalyserNode);
  });

  it("master fader is a GainNode", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    expect(mixer.graph.master.fader).toBeInstanceOf(GainNode);
  });

  it("master fader default gain is 1 (unity)", () => {
    const ctx = makeCtx();
    const master = createMasterBus(ctx);
    expect(master.fader.gain.value).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Sidechain source change updates routing
// ---------------------------------------------------------------------------

describe("sidechain compressor routing", () => {
  it("SidechainCompressor has audioInput, sidechainInput, and output nodes", () => {
    const ctx = makeCtx();
    const sc = new SidechainCompressor(ctx);

    expect(sc.audioInput).toBeInstanceOf(GainNode);
    expect(sc.sidechainInput).toBeInstanceOf(GainNode);
    expect(sc.sidechainGain).toBeInstanceOf(GainNode);
    expect(sc.compressor).toBeInstanceOf(DynamicsCompressorNode);
    expect(sc.output).toBeInstanceOf(GainNode);
  });

  it("setSidechainLevel updates sidechainGain", () => {
    const ctx = makeCtx();
    const sc = new SidechainCompressor(ctx);

    sc.setSidechainLevel(0.8);
    expect(sc.sidechainGain.gain.value).toBe(0.8);
  });

  it("setSidechainLevel 0 silences the sidechain path", () => {
    const ctx = makeCtx();
    const sc = new SidechainCompressor(ctx);

    sc.setSidechainLevel(0);
    expect(sc.sidechainGain.gain.value).toBe(0);
  });

  it("setSidechainLevel is clamped to [0,2]", () => {
    const ctx = makeCtx();
    const sc = new SidechainCompressor(ctx);

    sc.setSidechainLevel(5);
    expect(sc.sidechainGain.gain.value).toBe(2);

    sc.setSidechainLevel(-1);
    expect(sc.sidechainGain.gain.value).toBe(0);
  });

  it("default sidechain level is 1 (unity)", () => {
    const ctx = makeCtx();
    const sc = new SidechainCompressor(ctx);
    expect(sc.sidechainGain.gain.value).toBe(1);
  });

  it("two SidechainCompressors are independent", () => {
    const ctx = makeCtx();
    const sc1 = new SidechainCompressor(ctx);
    const sc2 = new SidechainCompressor(ctx);

    sc1.setSidechainLevel(0.3);
    sc2.setSidechainLevel(1.5);

    expect(sc1.sidechainGain.gain.value).toBe(0.3);
    expect(sc2.sidechainGain.gain.value).toBe(1.5);
  });

  it("dispose does not throw", () => {
    const ctx = makeCtx();
    const sc = new SidechainCompressor(ctx);
    expect(() => sc.dispose()).not.toThrow();
  });

  it("changing sidechain source: connect new source, disconnect old", () => {
    // Simulate: bass track sidechained from kick, then changed to snare
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("bass");
    mixer.addChannel("kick");
    mixer.addChannel("snare");

    const sc = new SidechainCompressor(ctx);

    // Wire bass audio through sidechain compressor
    const bassNodes = mixer.graph.channels.get("bass")!;
    bassNodes.output.connect(sc.audioInput);
    sc.output.connect(mixer.graph.master.fader);

    // Sidechain from kick
    const kickNodes = mixer.graph.channels.get("kick")!;
    kickNodes.output.connect(sc.sidechainInput);
    sc.setSidechainLevel(1);
    expect(sc.sidechainGain.gain.value).toBe(1);

    // Change sidechain to snare: disconnect kick, connect snare
    kickNodes.output.disconnect();
    const snareNodes = mixer.graph.channels.get("snare")!;
    snareNodes.output.connect(sc.sidechainInput);
    sc.setSidechainLevel(0.75);

    // Routing updated
    expect(sc.sidechainGain.gain.value).toBe(0.75);
    // Old connections cleared
    const kickOutput = kickNodes.output as unknown as { getConnections(): unknown[] };
    expect(kickOutput.getConnections()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Bus isolation — buses don't bleed into each other
// ---------------------------------------------------------------------------

describe("bus isolation", () => {
  it("two send buses are separate GainNode instances", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addSendBus("reverb");
    mixer.addSendBus("delay");

    const reverb = mixer.graph.sendBuses.get("reverb")!;
    const delay = mixer.graph.sendBuses.get("delay")!;

    expect(reverb.input).not.toBe(delay.input);
    expect(reverb.output).not.toBe(delay.output);
  });

  it("per-channel sends to different buses are independent GainNodes", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("vox");
    mixer.addSendBus("reverb");
    mixer.addSendBus("delay");

    mixer.setSendLevel("vox", "reverb", 0.9);
    mixer.setSendLevel("vox", "delay", 0.1);

    const nodes = mixer.graph.channels.get("vox")!;
    const reverbGain = nodes.sendGains.get("reverb")!;
    const delayGain = nodes.sendGains.get("delay")!;

    expect(reverbGain).not.toBe(delayGain);
    expect(reverbGain.gain.value).toBe(0.9);
    expect(delayGain.gain.value).toBe(0.1);
  });

  it("AuxBus dispose does not throw", () => {
    const ctx = makeCtx();
    const bus = new AuxBus(ctx, "chorus");
    expect(() => bus.dispose()).not.toThrow();
  });

  it("channel analyser is independent per channel", () => {
    const ctx = makeCtx();
    const mixer = new MixerNode(ctx);
    mixer.addChannel("ch1");
    mixer.addChannel("ch2");

    const a1 = mixer.getChannelAnalyser("ch1");
    const a2 = mixer.getChannelAnalyser("ch2");

    expect(a1).not.toBeNull();
    expect(a2).not.toBeNull();
    expect(a1).not.toBe(a2);
  });
});
