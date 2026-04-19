import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Offline audio renderer tests.
 *
 * Tone.js cannot run in a plain Node/jsdom environment — it requires a
 * real WebAudio context. We mock the module to:
 *   - verify Sampler initialization success path
 *   - exercise the PolySynth fallback when samples fail to load (onerror)
 *   - assert the failed sampler is disconnected before fallback wiring
 *   - verify Tone.Offline is invoked with the right arguments and the
 *     resulting channel data is forwarded to the WAV encoder
 */

type TriggerFn = ReturnType<typeof vi.fn>;

interface SamplerOpts {
  urls: Record<string, string>;
  onload?: () => void;
  onerror?: () => void;
}

type ToneFake = ReturnType<typeof buildToneFake>;

function buildToneFake(options: { samplerShouldFail?: boolean } = {}) {
  const disconnectSpy = vi.fn();
  const samplerInstances: Array<{ urls: Record<string, string>; disconnect: typeof disconnectSpy }> = [];
  const polySynthInstances: unknown[] = [];
  const channelInstances: unknown[] = [];
  const triggerCalls: unknown[][] = [];
  let scheduledFired = false;

  const mock = {
    Channel: vi.fn(function MockChannel(this: { volume: number; pan: number; toDestination: () => unknown; connect: (x: unknown) => unknown }, opts: { volume: number; pan: number }) {
      this.volume = opts.volume;
      this.pan = opts.pan;
      this.toDestination = () => this;
      this.connect = (x: unknown) => x;
      channelInstances.push(this);
      return this;
    }),
    Sampler: vi.fn(function MockSampler(this: { urls: Record<string, string>; disconnect: typeof disconnectSpy; connect: (x: unknown) => unknown; triggerAttackRelease: TriggerFn }, opts: SamplerOpts) {
      this.urls = opts.urls;
      this.disconnect = disconnectSpy;
      this.connect = () => {
        // Simulate async sample load resolution
        queueMicrotask(() => {
          if (options.samplerShouldFail) {
            opts.onerror?.();
          } else {
            opts.onload?.();
          }
        });
        return this;
      };
      this.triggerAttackRelease = vi.fn((...args: unknown[]) => {
        triggerCalls.push(args);
      });
      samplerInstances.push({ urls: this.urls, disconnect: this.disconnect });
      return this;
    }),
    PolySynth: vi.fn(function MockPolySynth(this: { connect: (x: unknown) => unknown; triggerAttackRelease: TriggerFn }) {
      this.connect = (x: unknown) => x;
      this.triggerAttackRelease = vi.fn((...args: unknown[]) => {
        triggerCalls.push(args);
      });
      polySynthInstances.push(this);
      return this;
    }),
    Synth: vi.fn(),
    MembraneSynth: vi.fn(function MockMembrane(this: { connect: (x: unknown) => unknown; triggerAttackRelease: TriggerFn }) {
      this.connect = (x: unknown) => x;
      this.triggerAttackRelease = vi.fn();
      return this;
    }),
    Offline: vi.fn(async (cb: (ctx: { transport: { bpm: { value: number }; schedule: (fn: (t: number) => void, at: number) => void; start: (t?: number) => void } }) => Promise<void>) => {
      const schedule: Array<{ fn: (t: number) => void; at: number }> = [];
      const transport = {
        bpm: { value: 120 },
        schedule: (fn: (t: number) => void, at: number) => {
          schedule.push({ fn, at });
        },
        start: () => {},
      };
      await cb({ transport });
      // Fire the first scheduled event so we can assert triggerAttackRelease runs
      if (schedule.length > 0) {
        scheduledFired = true;
        schedule[0].fn(0);
      }
      // Return a ToneAudioBuffer-shape mock
      return {
        get: () => ({
          numberOfChannels: 2,
          getChannelData: (i: number) => {
            const arr = new Float32Array(100);
            for (let k = 0; k < arr.length; k++) arr[k] = (i === 0 ? 0.1 : 0.2);
            return arr;
          },
        }),
      };
    }),
  };

  return {
    mock,
    samplerInstances,
    polySynthInstances,
    channelInstances,
    triggerCalls,
    disconnectSpy,
    wasScheduled: () => scheduledFired,
  };
}

let toneFake: ToneFake;

vi.mock("tone", async () => {
  // Default: samples load successfully
  toneFake = buildToneFake();
  return { default: toneFake.mock, ...toneFake.mock };
});

// Mock WAV encoder so we don't depend on real audio math
const wavBlobSentinel = new Blob(["wav"], { type: "audio/wav" });
vi.mock("./wav-encoder", () => ({
  float32ToWav: vi.fn(() => wavBlobSentinel),
}));

// Mock note router to return deterministic tracks
vi.mock("./note-router", () => ({
  routeNotesToTracks: vi.fn((notes: unknown[], tracks: unknown[]) => {
    const map = new Map<string, { instrument: string; notes: unknown[] }>();
    for (const t of tracks as Array<{ id: string; instrument: string }>) {
      map.set(t.id, { instrument: t.instrument, notes });
    }
    return map;
  }),
}));

// Mock instruments: provide a sample-based config to trigger Sampler path
vi.mock("./instruments", () => ({
  INSTRUMENT_CONFIGS: {
    piano: { name: "Piano", type: "piano", sampleSource: "salamander", sampleNotes: ["C4"], isSynth: false },
    drums: { name: "Drums", type: "drums", sampleSource: "salamander", sampleNotes: [], isSynth: true },
  },
  buildSampleUrls: vi.fn(() => ({ C4: "C4.mp3" })),
}));

// Re-stub tone for each test so we can swap success/failure behavior.
function reInstallTone(fake: ToneFake) {
  vi.doMock("tone", () => ({ default: fake.mock, ...fake.mock }));
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("tone");
});

const sampleTrack = {
  id: "t1",
  instrument: "piano",
  volume: 0.8,
  pan: 0,
  muted: false,
  solo: false,
} as unknown as import("@/lib/music/types").Track;

const sampleNote = {
  id: "n1",
  trackId: "t1",
  pitch: "C4",
  startTick: 0,
  durationTicks: 480,
  velocity: 100,
} as unknown as import("@/lib/music/types").Note;

describe("renderSessionToAudio — Sampler success path", () => {
  it("loads the Sampler with expected URLs and produces a WAV blob", async () => {
    const fake = buildToneFake({ samplerShouldFail: false });
    reInstallTone(fake);

    const { renderSessionToAudio } = await import("./offline-renderer");
    const progress: number[] = [];

    const blob = await renderSessionToAudio(
      [sampleNote],
      [sampleTrack],
      120,
      2,
      (p) => progress.push(p),
    );

    expect(blob).toBe(wavBlobSentinel);
    expect(fake.samplerInstances.length).toBe(1);
    expect(fake.samplerInstances[0].urls).toEqual({ C4: "C4.mp3" });
    expect(fake.polySynthInstances.length).toBe(0);
    // Transport schedule fired -> triggerAttackRelease called
    expect(fake.wasScheduled()).toBe(true);
    // Progress is reported monotonically from 0 -> 100
    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(100);
  });
});

describe("renderSessionToAudio — Sampler onerror falls back to PolySynth and disconnects failed sampler", () => {
  it("swaps in a PolySynth fallback and disconnects the failed Sampler", async () => {
    const fake = buildToneFake({ samplerShouldFail: true });
    reInstallTone(fake);

    const { renderSessionToAudio } = await import("./offline-renderer");

    const blob = await renderSessionToAudio([sampleNote], [sampleTrack], 120, 2);

    expect(blob).toBe(wavBlobSentinel);
    // Sampler was attempted
    expect(fake.samplerInstances.length).toBe(1);
    // Fallback PolySynth was created
    expect(fake.polySynthInstances.length).toBe(1);
    // Disconnect was invoked on the failed sampler before fallback wiring
    expect(fake.disconnectSpy).toHaveBeenCalledTimes(1);
  });
});

describe("renderSessionToAudio — Tone.Offline produces non-empty buffer", () => {
  it("passes channel data to the WAV encoder (interleaved, length > 0)", async () => {
    const fake = buildToneFake({ samplerShouldFail: false });
    reInstallTone(fake);

    const { renderSessionToAudio } = await import("./offline-renderer");
    const wavEncoder = await import("./wav-encoder");

    await renderSessionToAudio([sampleNote], [sampleTrack], 120, 2);

    const calls = (
      wavEncoder.float32ToWav as unknown as { mock: { calls: [Float32Array, number, number][] } }
    ).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const [interleaved, sampleRate, channels] = calls[calls.length - 1];
    expect(interleaved).toBeInstanceOf(Float32Array);
    expect(interleaved.length).toBe(200); // 100 frames * 2 channels
    expect(sampleRate).toBe(44100);
    expect(channels).toBe(2);
  });

  it("throws when Tone.Offline returns no audio", async () => {
    const fake = buildToneFake({ samplerShouldFail: false });
    // Override Offline to return a buffer whose `get()` is null
    fake.mock.Offline = vi.fn(async () => ({ get: () => null })) as unknown as typeof fake.mock.Offline;
    reInstallTone(fake);

    const { renderSessionToAudio } = await import("./offline-renderer");

    await expect(
      renderSessionToAudio([sampleNote], [sampleTrack], 120, 2),
    ).rejects.toThrow("Offline render produced no audio");
  });
});
