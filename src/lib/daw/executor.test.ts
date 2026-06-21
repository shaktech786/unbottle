/**
 * Integration tests for executeDAWTool.
 * Each test creates a fresh DAWState and calls executeDAWTool directly —
 * no mocks, real Zustand-style mutations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DAWState } from "./state";
import { executeDAWTool } from "./executor";
import { ToneBackend } from "./backends/tone-backend";

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

let daw: DAWState;
let backend: ToneBackend;

beforeEach(() => {
  daw = new DAWState();
  backend = new ToneBackend(daw);
});

// ---------------------------------------------------------------------------
// createTrack
// ---------------------------------------------------------------------------

describe("createTrack", () => {
  it("adds a track to state", async () => {
    const result = await executeDAWTool(daw, backend, "createTrack", { name: "Bass" });

    expect(result.success).toBe(true);
    expect(result.state_delta?.tracks).toHaveLength(1);
    expect(daw.tracks[0].name).toBe("Bass");
  });

  it("uses the provided instrument", async () => {
    await executeDAWTool(daw, backend, "createTrack", {
      name: "Rhythm Guitar",
      instrument: "guitar_electric",
    });

    expect(daw.tracks[0].instrument).toBe("guitar_electric");
  });

  it("defaults instrument to synth when omitted", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Pad" });

    expect(daw.tracks[0].instrument).toBe("synth");
  });

  it("returns error when name is missing", async () => {
    const result = await executeDAWTool(daw, backend, "createTrack", {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name/i);
  });

  it("adds multiple tracks in order", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Track 1" });
    await executeDAWTool(daw, backend, "createTrack", { name: "Track 2" });

    expect(daw.tracks).toHaveLength(2);
    expect(daw.tracks[0].name).toBe("Track 1");
    expect(daw.tracks[1].name).toBe("Track 2");
  });
});

// ---------------------------------------------------------------------------
// deleteTrack
// ---------------------------------------------------------------------------

describe("deleteTrack", () => {
  it("removes the track from state", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Lead" });
    const trackId = daw.tracks[0].id;

    const result = await executeDAWTool(daw, backend, "deleteTrack", { trackId });

    expect(result.success).toBe(true);
    expect(daw.tracks).toHaveLength(0);
  });

  it("returns error for unknown trackId", async () => {
    const result = await executeDAWTool(daw, backend, "deleteTrack", { trackId: "nonexistent" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// setTempo
// ---------------------------------------------------------------------------

describe("setTempo", () => {
  it("updates BPM in state", async () => {
    const result = await executeDAWTool(daw, backend, "setTempo", { bpm: 140 });

    expect(result.success).toBe(true);
    expect(daw.bpm).toBe(140);
    expect(result.state_delta?.bpm).toBe(140);
  });

  it("clamps BPM to valid range", async () => {
    await executeDAWTool(daw, backend, "setTempo", { bpm: 5 });
    expect(daw.bpm).toBe(20);

    await executeDAWTool(daw, backend, "setTempo", { bpm: 999 });
    expect(daw.bpm).toBe(400);
  });

  it("returns error for non-numeric bpm", async () => {
    const result = await executeDAWTool(daw, backend, "setTempo", { bpm: "fast" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/bpm/i);
  });
});

// ---------------------------------------------------------------------------
// muteTrack
// ---------------------------------------------------------------------------

describe("muteTrack", () => {
  it("sets muted=true on a track", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Drums" });
    const trackId = daw.tracks[0].id;

    const result = await executeDAWTool(daw, backend, "muteTrack", { trackId, muted: true });

    expect(result.success).toBe(true);
    expect(daw.tracks[0].muted).toBe(true);
  });

  it("toggles mute flag when muted param is omitted", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Bass" });
    const trackId = daw.tracks[0].id;

    // initially unmuted → mute
    await executeDAWTool(daw, backend, "muteTrack", { trackId });
    expect(daw.tracks[0].muted).toBe(true);

    // muted → unmute
    await executeDAWTool(daw, backend, "muteTrack", { trackId });
    expect(daw.tracks[0].muted).toBe(false);
  });

  it("returns error for unknown track", async () => {
    const result = await executeDAWTool(daw, backend, "muteTrack", { trackId: "ghost" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// soloTrack
// ---------------------------------------------------------------------------

describe("soloTrack", () => {
  it("sets solo=true on a track", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Lead Synth" });
    const trackId = daw.tracks[0].id;

    const result = await executeDAWTool(daw, backend, "soloTrack", { trackId, solo: true });

    expect(result.success).toBe(true);
    expect(daw.tracks[0].solo).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setVolume
// ---------------------------------------------------------------------------

describe("setVolume", () => {
  it("updates the track volume", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Pad" });
    const trackId = daw.tracks[0].id;

    const result = await executeDAWTool(daw, backend, "setVolume", { trackId, volume: 0.5 });

    expect(result.success).toBe(true);
    expect(daw.tracks[0].volume).toBeCloseTo(0.5);
  });

  it("clamps volume to 0–1", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Pad" });
    const trackId = daw.tracks[0].id;

    await executeDAWTool(daw, backend, "setVolume", { trackId, volume: 2.5 });
    expect(daw.tracks[0].volume).toBe(1);

    await executeDAWTool(daw, backend, "setVolume", { trackId, volume: -1 });
    expect(daw.tracks[0].volume).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// addClip
// ---------------------------------------------------------------------------

describe("addClip", () => {
  it("adds a clip to an existing track", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Piano" });
    const trackId = daw.tracks[0].id;

    const result = await executeDAWTool(daw, backend, "addClip", {
      trackId,
      name: "Intro Riff",
      startBar: 1,
      lengthBars: 4,
    });

    expect(result.success).toBe(true);
    expect(daw.clips).toHaveLength(1);
    expect(daw.clips[0].name).toBe("Intro Riff");
    expect(daw.clips[0].trackId).toBe(trackId);
  });

  it("returns error for unknown track", async () => {
    const result = await executeDAWTool(daw, backend, "addClip", {
      trackId: "missing",
      startBar: 1,
      lengthBars: 4,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// play / pause / stop
// ---------------------------------------------------------------------------

describe("playback controls", () => {
  it("play sets status to playing", async () => {
    const result = await executeDAWTool(daw, backend, "play", {});

    expect(result.success).toBe(true);
    expect(daw.playback.status).toBe("playing");
  });

  it("pause sets status to paused", async () => {
    await executeDAWTool(daw, backend, "play", {});
    await executeDAWTool(daw, backend, "pause", {});

    expect(daw.playback.status).toBe("paused");
  });

  it("stop sets status to stopped and resets bar to 1", async () => {
    await executeDAWTool(daw, backend, "play", { fromBar: 5 });
    await executeDAWTool(daw, backend, "stop", {});

    expect(daw.playback.status).toBe("stopped");
    expect(daw.playback.currentBar).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// undo / redo
// ---------------------------------------------------------------------------

describe("undo / redo", () => {
  it("undo reverses a createTrack", async () => {
    await executeDAWTool(daw, backend, "createTrack", { name: "Guitar" });
    expect(daw.tracks).toHaveLength(1);

    const result = await executeDAWTool(daw, backend, "undo", {});

    expect(result.success).toBe(true);
    expect(daw.tracks).toHaveLength(0);
  });

  it("redo re-applies after undo", async () => {
    await executeDAWTool(daw, backend, "setTempo", { bpm: 160 });
    await executeDAWTool(daw, backend, "undo", {});
    expect(daw.bpm).toBe(120);

    const result = await executeDAWTool(daw, backend, "redo", {});

    expect(result.success).toBe(true);
    expect(daw.bpm).toBe(160);
  });

  it("returns error when nothing to undo", async () => {
    const result = await executeDAWTool(daw, backend, "undo", {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/nothing to undo/i);
  });

  it("returns error when nothing to redo", async () => {
    const result = await executeDAWTool(daw, backend, "redo", {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/nothing to redo/i);
  });
});

// ---------------------------------------------------------------------------
// Unknown tool
// ---------------------------------------------------------------------------

describe("unknown tool", () => {
  it("returns error result for unrecognised tool name", async () => {
    const result = await executeDAWTool(daw, backend, "launchRocket", { payload: "moon" });

    expect(result.success).toBe(false);
    expect(result.state_delta).toBeNull();
    expect(result.error).toMatch(/unknown tool/i);
  });
});
