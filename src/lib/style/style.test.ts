/**
 * MAIN-35 — Tests for style inference and profile update pipeline.
 *
 * Tests:
 * 1. analyzeAudioFeatures with synthetic OfflineAudioContext buffers
 * 2. validateStyleProfile accepts/rejects profiles correctly
 * 3. buildStyleContext includes profile data in output string
 */

import { describe, it, expect } from "vitest";
import { analyzeAudioFeatures } from "./analyze-audio-features";
import { validateStyleProfile, createDefaultStyleProfile } from "./schema";
import { buildStyleContext } from "./build-style-context";
import type { StyleProfile } from "./schema";

// ---------------------------------------------------------------------------
// Synthetic AudioBuffer factory
// ---------------------------------------------------------------------------

function makeSineBuffer(
  freq: number,
  durationSec: number,
  sampleRate = 44100,
): AudioBuffer {
  const length = Math.floor(durationSec * sampleRate);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  const buffer: AudioBuffer = {
    numberOfChannels: 1,
    length,
    sampleRate,
    duration: durationSec,
    getChannelData: (ch: number) => (ch === 0 ? data : new Float32Array(length)),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
  return buffer;
}

function makeSilentBuffer(durationSec: number, sampleRate = 44100): AudioBuffer {
  return makeSineBuffer(0, durationSec, sampleRate);
}

function makeBeatBuffer(bpm: number, durationSec: number, sampleRate = 44100): AudioBuffer {
  const length = Math.floor(durationSec * sampleRate);
  const data = new Float32Array(length);
  const beatInterval = Math.floor((60 / bpm) * sampleRate);
  // Inject short energy bursts at beat positions
  for (let beat = 0; beat * beatInterval < length; beat++) {
    const pos = beat * beatInterval;
    for (let j = 0; j < 512 && pos + j < length; j++) {
      data[pos + j] = j < 50 ? 1.0 : 0.0; // sharp onset
    }
  }
  return {
    numberOfChannels: 1,
    length,
    sampleRate,
    duration: durationSec,
    getChannelData: (ch: number) => (ch === 0 ? data : new Float32Array(length)),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

// ---------------------------------------------------------------------------
// analyzeAudioFeatures
// ---------------------------------------------------------------------------

describe("analyzeAudioFeatures", () => {
  it("returns a number for bpm on a silent buffer", () => {
    const buffer = makeSilentBuffer(2);
    const result = analyzeAudioFeatures(buffer);
    expect(typeof result.bpm).toBe("number");
    expect(result.bpm).toBeGreaterThanOrEqual(40);
    expect(result.bpm).toBeLessThanOrEqual(300);
  });

  it("returns a string for key on a silent buffer", () => {
    const buffer = makeSilentBuffer(2);
    const result = analyzeAudioFeatures(buffer);
    expect(typeof result.key).toBe("string");
    expect(result.key.length).toBeGreaterThan(0);
  });

  it("detects a key string containing 'major' or 'minor'", () => {
    const buffer = makeSineBuffer(440, 2); // A4 sine tone
    const result = analyzeAudioFeatures(buffer);
    expect(result.key).toMatch(/major|minor/);
  });

  it("detects BPM in a plausible range for a 120-BPM beat signal", () => {
    // We can't guarantee exact BPM detection from synthetic data,
    // but we can verify it returns a reasonable number in range.
    const buffer = makeBeatBuffer(120, 4);
    const result = analyzeAudioFeatures(buffer);
    expect(result.bpm).toBeGreaterThanOrEqual(40);
    expect(result.bpm).toBeLessThanOrEqual(300);
  });

  it("returns bpm and key fields with correct types", () => {
    const buffer = makeSineBuffer(261.63, 1); // ~C4
    const result = analyzeAudioFeatures(buffer);
    expect(result).toHaveProperty("bpm");
    expect(result).toHaveProperty("key");
    expect(typeof result.bpm).toBe("number");
    expect(typeof result.key).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// validateStyleProfile
// ---------------------------------------------------------------------------

describe("validateStyleProfile", () => {
  it("accepts a valid profile", () => {
    const profile: StyleProfile = {
      id: "style-abc",
      userId: "user-123",
      keySignatures: ["C major", "A minor"],
      tempoRange: [80, 130],
      genres: ["Lo-fi", "Hip-Hop"],
      vibes: ["Chill", "Dreamy"],
      updatedAt: new Date().toISOString(),
    };
    const result = validateStyleProfile(profile);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects non-object input", () => {
    const result = validateStyleProfile("not an object");
    expect(result.valid).toBe(false);
  });

  it("rejects missing userId", () => {
    const profile = createDefaultStyleProfile("user-1");
    const bad = { ...profile, userId: "" };
    const result = validateStyleProfile(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("userId"))).toBe(true);
  });

  it("rejects invalid key signature format", () => {
    const profile = createDefaultStyleProfile("user-1");
    const bad = { ...profile, keySignatures: ["X zap"] };
    const result = validateStyleProfile(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("keySignatures"))).toBe(true);
  });

  it("rejects tempoRange where min > max", () => {
    const profile = createDefaultStyleProfile("user-1");
    const bad = { ...profile, tempoRange: [200, 100] as [number, number] };
    const result = validateStyleProfile(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("tempoRange"))).toBe(true);
  });

  it("rejects tempoRange values out of [20, 400] bounds", () => {
    const profile = createDefaultStyleProfile("user-1");
    const bad = { ...profile, tempoRange: [10, 500] as [number, number] };
    const result = validateStyleProfile(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("tempoRange"))).toBe(true);
  });

  it("rejects tempoRange that is not an array of 2", () => {
    const profile = createDefaultStyleProfile("user-1");
    const bad = { ...profile, tempoRange: [120] as unknown as [number, number] };
    const result = validateStyleProfile(bad);
    expect(result.valid).toBe(false);
  });

  it("rejects genres that are not strings", () => {
    const profile = createDefaultStyleProfile("user-1");
    const bad = { ...profile, genres: [1, 2, 3] as unknown as string[] };
    const result = validateStyleProfile(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("genres"))).toBe(true);
  });

  it("accepts valid key signatures with sharps and flats", () => {
    const profile: StyleProfile = {
      id: "x",
      userId: "u1",
      keySignatures: ["F# minor", "Bb major", "Db major"],
      tempoRange: [90, 150],
      genres: [],
      vibes: [],
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const result = validateStyleProfile(profile);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildStyleContext
// ---------------------------------------------------------------------------

describe("buildStyleContext", () => {
  it("returns null for an empty / default profile", () => {
    const profile = createDefaultStyleProfile("user-1");
    const result = buildStyleContext(profile);
    // Default profile has no keys, genres, or vibes — and default tempo range
    expect(result).toBeNull();
  });

  it("includes key signatures in output", () => {
    const profile: StyleProfile = {
      id: "s1",
      userId: "u1",
      keySignatures: ["C major", "A minor"],
      tempoRange: [80, 140],
      genres: [],
      vibes: [],
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const result = buildStyleContext(profile);
    expect(result).not.toBeNull();
    expect(result).toContain("C major");
    expect(result).toContain("A minor");
  });

  it("includes genre information in output", () => {
    const profile: StyleProfile = {
      id: "s2",
      userId: "u2",
      keySignatures: [],
      tempoRange: [80, 140],
      genres: ["Lo-fi", "Jazz"],
      vibes: [],
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const result = buildStyleContext(profile);
    expect(result).not.toBeNull();
    expect(result).toContain("Lo-fi");
    expect(result).toContain("Jazz");
  });

  it("includes vibes in output", () => {
    const profile: StyleProfile = {
      id: "s3",
      userId: "u3",
      keySignatures: [],
      tempoRange: [80, 140],
      genres: [],
      vibes: ["Chill", "Nostalgic"],
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const result = buildStyleContext(profile);
    expect(result).not.toBeNull();
    expect(result).toContain("Chill");
    expect(result).toContain("Nostalgic");
  });

  it("includes custom tempo range when different from default", () => {
    const profile: StyleProfile = {
      id: "s4",
      userId: "u4",
      keySignatures: [],
      tempoRange: [60, 90],
      genres: [],
      vibes: [],
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const result = buildStyleContext(profile);
    expect(result).not.toBeNull();
    expect(result).toContain("60");
    expect(result).toContain("90");
  });

  it("output contains Style DNA heading", () => {
    const profile: StyleProfile = {
      id: "s5",
      userId: "u5",
      keySignatures: ["D major"],
      tempoRange: [100, 160],
      genres: ["Electronic"],
      vibes: ["Energetic"],
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const result = buildStyleContext(profile);
    expect(result).toContain("Style DNA");
  });
});
