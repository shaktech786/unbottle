import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// Web Audio API stub for Node/Vitest environment.
// Models all node types used by graph-design.ts, mixer-node.ts, synth-engine.ts,
// sample-player-engine.ts, and drum-sequencer-engine.ts.
// ---------------------------------------------------------------------------

class MockAudioParam {
  value: number;
  constructor(defaultValue = 0) {
    this.value = defaultValue;
  }
  setValueAtTime(value: number, _time: number) {
    this.value = value;
    return this;
  }
  linearRampToValueAtTime(value: number, _time: number) {
    this.value = value;
    return this;
  }
  exponentialRampToValueAtTime(value: number, _time: number) {
    this.value = value;
    return this;
  }
  cancelScheduledValues(_time: number) {
    return this;
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

class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = "sine";
  frequency = new MockAudioParam(440);
  detune = new MockAudioParam(0);
  private _started = false;
  private _stopped = false;
  onended: (() => void) | null = null;
  start(_time?: number) {
    this._started = true;
  }
  stop(_time?: number) {
    this._stopped = true;
    this.onended?.();
  }
  get started() {
    return this._started;
  }
  get stopped() {
    return this._stopped;
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = "lowpass";
  frequency = new MockAudioParam(350);
  Q = new MockAudioParam(1);
  gain = new MockAudioParam(0);
  detune = new MockAudioParam(0);
}

class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: AudioBuffer | null = null;
  playbackRate = new MockAudioParam(1);
  loop = false;
  onended: (() => void) | null = null;
  private _started = false;
  start(_time?: number, _offset?: number, _duration?: number) {
    this._started = true;
  }
  stop(_time?: number) {
    this.onended?.();
  }
  get started() {
    return this._started;
  }
}

class MockAudioDestinationNode extends MockAudioNode {}

class MockAnalyserNode extends MockAudioNode {
  fftSize = 2048;
  smoothingTimeConstant = 0.8;
  frequencyBinCount = 1024;
  minDecibels = -100;
  maxDecibels = -30;

  getFloatTimeDomainData(array: Float32Array) {
    // Return a quiet signal by default
    array.fill(0);
  }
  getFloatFrequencyData(array: Float32Array) {
    array.fill(-Infinity);
  }
  getByteTimeDomainData(array: Uint8Array) {
    array.fill(128);
  }
  getByteFrequencyData(array: Uint8Array) {
    array.fill(0);
  }
}

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
  createAnalyser() {
    return new MockAnalyserNode();
  }
  createOscillator() {
    return new MockOscillatorNode();
  }
  createBiquadFilter() {
    return new MockBiquadFilterNode();
  }
  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    const data = Array.from({ length: channels }, () => {
      const buf = new Float32Array(length);
      // Fill with a non-silent sine so smoke tests can assert non-zero output
      for (let i = 0; i < length; i++) {
        buf[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
      }
      return buf;
    });
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: (ch: number) => data[ch] ?? new Float32Array(length),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as unknown as AudioBuffer;
  }
  async decodeAudioData(ab: ArrayBuffer): Promise<AudioBuffer> {
    const length = Math.max(44100, Math.floor(ab.byteLength / 4));
    return this.createBuffer(1, length, this.sampleRate);
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

  constructor(
    opts:
      | { numberOfChannels: number; length: number; sampleRate?: number }
      | number,
    length?: number,
    sampleRate?: number,
  ) {
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
    const len = this.length;
    const sr = this.sampleRate;
    const channels = this.numberOfChannels;
    // Return non-silent data so smoke tests can assert output > 0
    return {
      numberOfChannels: channels,
      length: len,
      sampleRate: sr,
      duration: len / sr,
      getChannelData: (ch: number) => {
        const buf = new Float32Array(len);
        // ch=0 → sine wave signal; ch=1 → slightly different signal
        const amp = ch === 0 ? 0.1 : 0.2;
        for (let i = 0; i < len; i++) {
          buf[i] = Math.sin((2 * Math.PI * 440 * i) / sr) * amp;
        }
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
  AnalyserNode: MockAnalyserNode,
  OscillatorNode: MockOscillatorNode,
  BiquadFilterNode: MockBiquadFilterNode,
  AudioBufferSourceNode: MockAudioBufferSourceNode,
  AudioNode: MockAudioNode,
});
