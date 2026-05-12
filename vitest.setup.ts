import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// Minimal Web Audio API stub for Node/Vitest environment.
// Only the node types used by graph-design.ts and mixer-node.ts are modelled.
// ---------------------------------------------------------------------------

class MockAudioParam {
  value: number;
  constructor(defaultValue = 0) {
    this.value = defaultValue;
  }
}

class MockAudioNode {
  private _connections: MockAudioNode[] = [];
  connect(dest: MockAudioNode) {
    this._connections.push(dest);
    return dest;
  }
  disconnect() {
    this._connections = [];
  }
  getConnections() {
    return this._connections;
  }
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam(1);
}

class MockStereoPannerNode extends MockAudioNode {
  pan = new MockAudioParam(0);
}

class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = new MockAudioParam(-24);
  knee = new MockAudioParam(30);
  ratio = new MockAudioParam(12);
  attack = new MockAudioParam(0.003);
  release = new MockAudioParam(0.25);
}

class MockAudioDestinationNode extends MockAudioNode {}

class MockBaseAudioContext {
  destination = new MockAudioDestinationNode();
  sampleRate = 44100;
  currentTime = 0;

  createGain() {
    return new MockGainNode();
  }
  createStereoPanner() {
    return new MockStereoPannerNode();
  }
  createDynamicsCompressor() {
    return new MockDynamicsCompressorNode();
  }
}

class MockAudioContext extends MockBaseAudioContext {
  state: AudioContextState = "running";
  async resume() {}
  async close() {}
}

class MockOfflineAudioContext extends MockBaseAudioContext {
  numberOfChannels: number;
  length: number;

  constructor(opts: { numberOfChannels: number; length: number; sampleRate?: number } | number, length?: number, sampleRate?: number) {
    super();
    if (typeof opts === "object") {
      this.numberOfChannels = opts.numberOfChannels;
      this.length = opts.length;
      if (opts.sampleRate) this.sampleRate = opts.sampleRate;
    } else {
      this.numberOfChannels = opts;
      this.length = length ?? 44100;
      if (sampleRate) this.sampleRate = sampleRate;
    }
  }

  async startRendering(): Promise<AudioBuffer> {
    return {
      numberOfChannels: this.numberOfChannels,
      length: this.length,
      sampleRate: this.sampleRate,
      duration: this.length / this.sampleRate,
      getChannelData: (ch: number) => {
        const buf = new Float32Array(this.length);
        for (let i = 0; i < buf.length; i++) buf[i] = ch === 0 ? 0.1 : 0.2;
        return buf;
      },
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as unknown as AudioBuffer;
  }
}

// Assign to global so test files see them as if in a browser environment
Object.assign(globalThis, {
  AudioContext: MockAudioContext,
  OfflineAudioContext: MockOfflineAudioContext,
  GainNode: MockGainNode,
  StereoPannerNode: MockStereoPannerNode,
  DynamicsCompressorNode: MockDynamicsCompressorNode,
  AudioNode: MockAudioNode,
});
