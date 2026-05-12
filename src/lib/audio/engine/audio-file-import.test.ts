/**
 * MAIN-160: audio-file-import tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isSupportedAudioFile,
  filterAudioFiles,
  importAudioFile,
  SUPPORTED_AUDIO_EXTENSIONS,
} from "./audio-file-import";
import { audioBufferStore } from "./audio-buffer-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, type: string, size = 100): File {
  return new File([new Uint8Array(size)], name, { type });
}

function makeFakeBuffer(): AudioBuffer {
  return {
    numberOfChannels: 2,
    length: 44100,
    sampleRate: 44100,
    duration: 1,
    getChannelData: () => new Float32Array(44100),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

// ---------------------------------------------------------------------------
// isSupportedAudioFile
// ---------------------------------------------------------------------------

describe("isSupportedAudioFile", () => {
  it.each([
    ["audio.wav", "audio/wav"],
    ["audio.mp3", "audio/mpeg"],
    ["audio.flac", "audio/flac"],
    ["audio.WAV", ""],          // extension-only match, uppercase
    ["audio.MP3", ""],
    ["audio.FLAC", ""],
    ["audio.mp3", "audio/x-wav"], // type says wav but extension says mp3 — still ok
  ])("accepts %s (type=%s)", (name, type) => {
    expect(isSupportedAudioFile(makeFile(name, type))).toBe(true);
  });

  it.each([
    ["video.mp4", "video/mp4"],
    ["image.png", "image/png"],
    ["doc.txt", "text/plain"],
    ["audio.ogg", "audio/ogg"],   // not in our supported list
  ])("rejects %s (type=%s)", (name, type) => {
    expect(isSupportedAudioFile(makeFile(name, type))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filterAudioFiles
// ---------------------------------------------------------------------------

describe("filterAudioFiles", () => {
  it("filters to only supported files", () => {
    const files = [
      makeFile("a.wav", "audio/wav"),
      makeFile("b.png", "image/png"),
      makeFile("c.mp3", "audio/mpeg"),
      makeFile("d.txt", "text/plain"),
      makeFile("e.flac", "audio/flac"),
    ];
    const result = filterAudioFiles(files);
    expect(result.map((f) => f.name)).toEqual(["a.wav", "c.mp3", "e.flac"]);
  });

  it("returns empty array when no audio files", () => {
    const files = [makeFile("a.png", "image/png"), makeFile("b.txt", "text/plain")];
    expect(filterAudioFiles(files)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// importAudioFile
// ---------------------------------------------------------------------------

describe("importAudioFile", () => {
  const fakeBuffer = makeFakeBuffer();

  beforeEach(() => {
    audioBufferStore.clear();
    // AudioContext must be a proper constructor (class)
    // @ts-expect-error — stub
    globalThis.AudioContext = class {
      decodeAudioData = vi.fn().mockResolvedValue(fakeBuffer);
      close = vi.fn().mockResolvedValue(undefined);
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    audioBufferStore.clear();
  });

  it("decodes and stores an AudioBuffer for a WAV file", async () => {
    const file = makeFile("drum loop.wav", "audio/wav");
    const result = await importAudioFile(file);

    expect(result.buffer).toBe(fakeBuffer);
    expect(result.key).toMatch(/^import-drum_loop-\d+$/);
    expect(result.name).toBe("drum_loop");
    expect(audioBufferStore.has(result.key)).toBe(true);
    expect(audioBufferStore.get(result.key)).toBe(fakeBuffer);
  });

  it("decodes and stores an AudioBuffer for an MP3 file", async () => {
    const file = makeFile("melody.mp3", "audio/mpeg");
    const result = await importAudioFile(file);
    expect(result.key).toMatch(/^import-melody-/);
    expect(audioBufferStore.has(result.key)).toBe(true);
  });

  it("decodes and stores an AudioBuffer for a FLAC file", async () => {
    const file = makeFile("bass.flac", "audio/flac");
    const result = await importAudioFile(file);
    expect(audioBufferStore.has(result.key)).toBe(true);
  });

  it("throws for an unsupported file type", async () => {
    const file = makeFile("video.mp4", "video/mp4");
    await expect(importAudioFile(file)).rejects.toThrow("Unsupported file type");
  });

  it("generates unique keys for multiple imports", async () => {
    const f1 = makeFile("a.wav", "audio/wav");
    const f2 = makeFile("a.wav", "audio/wav");
    const r1 = await importAudioFile(f1);
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 2));
    const r2 = await importAudioFile(f2);
    expect(r1.key).not.toBe(r2.key);
  });
});

// ---------------------------------------------------------------------------
// SUPPORTED_AUDIO_EXTENSIONS sanity check
// ---------------------------------------------------------------------------

describe("SUPPORTED_AUDIO_EXTENSIONS", () => {
  it("includes wav, mp3, and flac", () => {
    expect(SUPPORTED_AUDIO_EXTENSIONS).toContain(".wav");
    expect(SUPPORTED_AUDIO_EXTENSIONS).toContain(".mp3");
    expect(SUPPORTED_AUDIO_EXTENSIONS).toContain(".flac");
  });
});
