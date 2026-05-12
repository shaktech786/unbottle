/**
 * Integration tests for executeDAWTool.
 * Each test creates a fresh DAWState and calls executeDAWTool directly —
 * no mocks, real Zustand-style mutations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DAWState } from "./state";
import { executeDAWTool } from "./executor";

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

let daw: DAWState;

beforeEach(() => {
  daw = new DAWState();
});

// ---------------------------------------------------------------------------
// createTrack
// ---------------------------------------------------------------------------

describe("createTrack", () => {
  it("adds a track to state", () => {
    const result = executeDAWTool(daw, "createTrack", { name: "Bass" });

    expect(result.success).toBe(true);
    expect(result.state_delta?.tracks).toHaveLength(1);
    expect(daw.tracks[0].name).toBe("Bass");
  });

  it("uses the provided instrument", () => {
    executeDAWTool(daw, "createTrack", {
      name: "Rhythm Guitar",
      instrument: "guitar_electric",
    });

    expect(daw.tracks[0].instrument).toBe("guitar_electric");
  });

  it("defaults instrument to synth when omitted", () => {
    executeDAWTool(daw, "createTrack", { name: "Pad" });

    expect(daw.tracks[0].instrument).toBe("synth");
  });

  it("returns error when name is missing", () => {
    const result = executeDAWTool(daw, "createTrack", {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name/i);
  });

  it("adds multiple tracks in order", () => {
    executeDAWTool(daw, "createTrack", { name: "Track 1" });
    executeDAWTool(daw, "createTrack", { name: "Track 2" });

    expect(daw.tracks).toHaveLength(2);
    expect(daw.tracks[0].name).toBe("Track 1");
    expect(daw.tracks[1].name).toBe("Track 2");
  });
});

// ---------------------------------------------------------------------------
// deleteTrack
// ---------------------------------------------------------------------------

describe("deleteTrack", () => {
  it("removes the track from state", () => {
    executeDAWTool(daw, "createTrack", { name: "Lead" });
    const trackId = daw.tracks[0].id;

    const result = executeDAWTool(daw, "deleteTrack", { trackId });

    expect(result.success).toBe(true);
    expect(daw.tracks).toHaveLength(0);
  });

  it("returns error for unknown trackId", () => {
    const result = executeDAWTool(daw, "deleteTrack", { trackId: "nonexistent" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// setTempo
// ---------------------------------------------------------------------------

describe("setTempo", () => {
  it("updates BPM in state", () => {
    const result = executeDAWTool(daw, "setTempo", { bpm: 140 });

    expect(result.success).toBe(true);
    expect(daw.bpm).toBe(140);
    expect(result.state_delta?.bpm).toBe(140);
  });

  it("clamps BPM to valid range", () => {
    executeDAWTool(daw, "setTempo", { bpm: 5 });
    expect(daw.bpm).toBe(20);

    executeDAWTool(daw, "setTempo", { bpm: 999 });
    expect(daw.bpm).toBe(400);
  });

  it("returns error for non-numeric bpm", () => {
    const result = executeDAWTool(daw, "setTempo", { bpm: "fast" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/bpm/i);
  });
});

// ---------------------------------------------------------------------------
// muteTrack
// ---------------------------------------------------------------------------

describe("muteTrack", () => {
  it("sets muted=true on a track", () => {
    executeDAWTool(daw, "createTrack", { name: "Drums" });
    const trackId = daw.tracks[0].id;

    const result = executeDAWTool(daw, "muteTrack", { trackId, muted: true });

    expect(result.success).toBe(true);
    expect(daw.tracks[0].muted).toBe(true);
  });

  it("toggles mute flag when muted param is omitted", () => {
    executeDAWTool(daw, "createTrack", { name: "Bass" });
    const trackId = daw.tracks[0].id;

    // initially unmuted → mute
    executeDAWTool(daw, "muteTrack", { trackId });
    expect(daw.tracks[0].muted).toBe(true);

    // muted → unmute
    executeDAWTool(daw, "muteTrack", { trackId });
    expect(daw.tracks[0].muted).toBe(false);
  });

  it("returns error for unknown track", () => {
    const result = executeDAWTool(daw, "muteTrack", { trackId: "ghost" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// soloTrack
// ---------------------------------------------------------------------------

describe("soloTrack", () => {
  it("sets solo=true on a track", () => {
    executeDAWTool(daw, "createTrack", { name: "Lead Synth" });
    const trackId = daw.tracks[0].id;

    const result = executeDAWTool(daw, "soloTrack", { trackId, solo: true });

    expect(result.success).toBe(true);
    expect(daw.tracks[0].solo).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setVolume
// ---------------------------------------------------------------------------

describe("setVolume", () => {
  it("updates the track volume", () => {
    executeDAWTool(daw, "createTrack", { name: "Pad" });
    const trackId = daw.tracks[0].id;

    const result = executeDAWTool(daw, "setVolume", { trackId, volume: 0.5 });

    expect(result.success).toBe(true);
    expect(daw.tracks[0].volume).toBeCloseTo(0.5);
  });

  it("clamps volume to 0–1", () => {
    executeDAWTool(daw, "createTrack", { name: "Pad" });
    const trackId = daw.tracks[0].id;

    executeDAWTool(daw, "setVolume", { trackId, volume: 2.5 });
    expect(daw.tracks[0].volume).toBe(1);

    executeDAWTool(daw, "setVolume", { trackId, volume: -1 });
    expect(daw.tracks[0].volume).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// addClip
// ---------------------------------------------------------------------------

describe("addClip", () => {
  it("adds a clip to an existing track", () => {
    executeDAWTool(daw, "createTrack", { name: "Piano" });
    const trackId = daw.tracks[0].id;

    const result = executeDAWTool(daw, "addClip", {
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

  it("returns error for unknown track", () => {
    const result = executeDAWTool(daw, "addClip", {
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
  it("play sets status to playing", () => {
    const result = executeDAWTool(daw, "play", {});

    expect(result.success).toBe(true);
    expect(daw.playback.status).toBe("playing");
  });

  it("pause sets status to paused", () => {
    executeDAWTool(daw, "play", {});
    executeDAWTool(daw, "pause", {});

    expect(daw.playback.status).toBe("paused");
  });

  it("stop sets status to stopped and resets bar to 1", () => {
    executeDAWTool(daw, "play", { fromBar: 5 });
    executeDAWTool(daw, "stop", {});

    expect(daw.playback.status).toBe("stopped");
    expect(daw.playback.currentBar).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// undo / redo
// ---------------------------------------------------------------------------

describe("undo / redo", () => {
  it("undo reverses a createTrack", () => {
    executeDAWTool(daw, "createTrack", { name: "Guitar" });
    expect(daw.tracks).toHaveLength(1);

    const result = executeDAWTool(daw, "undo", {});

    expect(result.success).toBe(true);
    expect(daw.tracks).toHaveLength(0);
  });

  it("redo re-applies after undo", () => {
    executeDAWTool(daw, "setTempo", { bpm: 160 });
    executeDAWTool(daw, "undo", {});
    expect(daw.bpm).toBe(120);

    const result = executeDAWTool(daw, "redo", {});

    expect(result.success).toBe(true);
    expect(daw.bpm).toBe(160);
  });

  it("returns error when nothing to undo", () => {
    const result = executeDAWTool(daw, "undo", {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/nothing to undo/i);
  });

  it("returns error when nothing to redo", () => {
    const result = executeDAWTool(daw, "redo", {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/nothing to redo/i);
  });
});

// ---------------------------------------------------------------------------
// Unknown tool
// ---------------------------------------------------------------------------

describe("unknown tool", () => {
  it("returns error result for unrecognised tool name", () => {
    const result = executeDAWTool(daw, "launchRocket", { payload: "moon" });

    expect(result.success).toBe(false);
    expect(result.state_delta).toBeNull();
    expect(result.error).toMatch(/unknown tool/i);
  });
});
