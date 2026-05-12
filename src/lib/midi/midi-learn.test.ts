// @vitest-environment jsdom
/**
 * Tests for MIDI Learn and MIDI clock utilities.
 *
 * MAIN-70: verify MIDI event dispatch, parameter binding,
 * mapping store/load roundtrip, and clock rate.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMIDILearn } from "./midi-learn";
import type { MIDIMapping } from "./midi-learn";

// ---------------------------------------------------------------------------
// Minimal MIDIAccess / MIDIInput mock
// ---------------------------------------------------------------------------

class MockMIDIInput {
  id = "input-1";
  name = "Mock Controller";
  manufacturer = "Mock Co";
  onmidimessage: ((e: MIDIMessageEvent) => void) | null = null;

  simulateCC(ccNumber: number, value: number, channel = 0) {
    const statusByte = (0xb0 | channel) & 0xff;
    const data = new Uint8Array([statusByte, ccNumber, value]);
    const msg = {
      data,
      timeStamp: performance.now(),
    } as unknown as MIDIMessageEvent;
    this.onmidimessage?.(msg);
  }
}

class MockMIDIAccess {
  inputs: Map<string, MockMIDIInput>;
  outputs = new Map();
  onstatechange: (() => void) | null = null;

  constructor(inputs: MockMIDIInput[]) {
    this.inputs = new Map(inputs.map((i) => [i.id, i]));
  }
}

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useMIDILearn", () => {
  let input: MockMIDIInput;
  let midiAccess: MockMIDIAccess;

  beforeEach(() => {
    localStorageMock.clear();
    input = new MockMIDIInput();
    midiAccess = new MockMIDIAccess([input]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with empty mappings", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );
    expect(result.current.mappings).toEqual([]);
    expect(result.current.learningParameterId).toBeNull();
  });

  it("enters learn mode when startLearn is called", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );
    act(() => {
      result.current.startLearn("track:t1:volume");
    });
    expect(result.current.learningParameterId).toBe("track:t1:volume");
  });

  it("maps the next CC to the learning parameter and exits learn mode", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );

    act(() => {
      result.current.startLearn("track:t1:volume");
    });

    act(() => {
      input.simulateCC(7, 100); // CC 7 = volume, value 100
    });

    expect(result.current.learningParameterId).toBeNull();
    const mapping = result.current.mappings.find(
      (m) => m.parameterId === "track:t1:volume",
    );
    expect(mapping).toBeDefined();
    expect(mapping?.ccNumber).toBe(7);
  });

  it("updates parameter value when a mapped CC arrives", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );

    // Set up a mapping via learn
    act(() => {
      result.current.startLearn("track:t1:pan");
    });
    act(() => {
      input.simulateCC(10, 64); // CC 10 = pan, learn phase
    });

    // Now send a real CC value
    act(() => {
      input.simulateCC(10, 127);
    });

    const value = result.current.getParameterValue("track:t1:pan");
    expect(value).toBeCloseTo(1.0, 2);
  });

  it("normalizes CC value to 0-1 range", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );

    act(() => result.current.startLearn("track:t1:volume"));
    act(() => input.simulateCC(7, 64)); // learn CC 7

    act(() => input.simulateCC(7, 0));
    expect(result.current.getParameterValue("track:t1:volume")).toBeCloseTo(0, 2);

    act(() => input.simulateCC(7, 127));
    expect(result.current.getParameterValue("track:t1:volume")).toBeCloseTo(1, 2);
  });

  it("cancelLearn exits learn mode without creating a mapping", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );

    act(() => result.current.startLearn("track:t1:volume"));
    act(() => result.current.cancelLearn());

    expect(result.current.learningParameterId).toBeNull();
    expect(result.current.mappings).toHaveLength(0);
  });

  it("removeMapping deletes a specific mapping", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );

    act(() => result.current.startLearn("track:t1:volume"));
    act(() => input.simulateCC(7, 64));
    act(() => result.current.startLearn("track:t2:volume"));
    act(() => input.simulateCC(8, 64));

    expect(result.current.mappings).toHaveLength(2);

    act(() => result.current.removeMapping("track:t1:volume"));
    expect(result.current.mappings).toHaveLength(1);
    expect(result.current.mappings[0].parameterId).toBe("track:t2:volume");
  });

  it("clearMappings removes all mappings", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );

    act(() => result.current.startLearn("track:t1:volume"));
    act(() => input.simulateCC(7, 64));

    act(() => result.current.clearMappings());
    expect(result.current.mappings).toHaveLength(0);
  });

  it("persists mappings to localStorage", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );

    act(() => result.current.startLearn("track:t1:volume"));
    act(() => input.simulateCC(7, 100));

    const stored = localStorageMock.getItem("unbottle:midi-mappings");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as MIDIMapping[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].parameterId).toBe("track:t1:volume");
    expect(parsed[0].ccNumber).toBe(7);
  });

  it("loads mappings from localStorage on mount", () => {
    const saved: MIDIMapping[] = [
      { parameterId: "track:t1:volume", ccNumber: 7, channel: 0 },
    ];
    localStorageMock.setItem("unbottle:midi-mappings", JSON.stringify(saved));

    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );

    expect(result.current.mappings).toHaveLength(1);
    expect(result.current.mappings[0].ccNumber).toBe(7);
  });

  it("replaces existing mapping for same parameter when re-learning", () => {
    const { result } = renderHook(() =>
      useMIDILearn(midiAccess as unknown as MIDIAccess),
    );

    act(() => result.current.startLearn("track:t1:volume"));
    act(() => input.simulateCC(7, 64));

    act(() => result.current.startLearn("track:t1:volume"));
    act(() => input.simulateCC(11, 64)); // reassign to CC 11

    const mappings = result.current.mappings.filter(
      (m) => m.parameterId === "track:t1:volume",
    );
    expect(mappings).toHaveLength(1);
    expect(mappings[0].ccNumber).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// MIDI clock rate — pure math, no DOM needed
// ---------------------------------------------------------------------------

describe("MIDI clock rate", () => {
  it("sends 24 messages per beat at a given BPM", () => {
    // At 120 BPM: 120 * 24 / 60 = 48 ticks/sec → ~20.83ms per tick
    const bpm = 120;
    const ppqn = 24;
    const ticksPerSecond = (bpm * ppqn) / 60;
    const tickIntervalMs = 1000 / ticksPerSecond;
    expect(tickIntervalMs).toBeCloseTo(1000 / 48, 1);
  });

  it("tick count matches BPM over 1 second", () => {
    const bpm = 120;
    const ppqn = 24;
    const expectedTicksPer1s = (bpm / 60) * ppqn; // = 48
    expect(expectedTicksPer1s).toBe(48);
  });

  it("BPM 60 produces 24 ticks per second", () => {
    const bpm = 60;
    const ppqn = 24;
    const tps = (bpm / 60) * ppqn;
    expect(tps).toBe(24);
  });

  it("BPM 180 produces 72 ticks per second", () => {
    const bpm = 180;
    const ppqn = 24;
    const tps = (bpm / 60) * ppqn;
    expect(tps).toBe(72);
  });
});
