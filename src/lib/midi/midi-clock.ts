"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// MIDI clock tick message (0xF8), sent 24 times per quarter note
const MIDI_CLOCK = 0xf8;
// MIDI start (0xFA), stop (0xFC) messages
const MIDI_START = 0xfa;
const MIDI_STOP = 0xfc;

const PPQN = 24; // MIDI standard: 24 pulses per quarter note

export interface UseMIDIClockReturn {
  /** Whether MIDI clock output is currently active */
  isRunning: boolean;
  /** ID of the selected MIDI output device */
  selectedOutputId: string | null;
  /** All available MIDI output devices */
  outputs: MIDIOutputInfo[];
  /** Start sending MIDI clock */
  start: () => void;
  /** Stop sending MIDI clock */
  stop: () => void;
  /** Select a MIDI output device */
  setOutputId: (id: string | null) => void;
}

export interface MIDIOutputInfo {
  id: string;
  name: string;
  manufacturer: string;
}

function checkMIDISupport(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.requestMIDIAccess === "function";
}

/**
 * Send MIDI clock output at 24 ppqn synced to the DAW BPM.
 *
 * Ticks are scheduled using `AudioContext.currentTime` for sub-millisecond
 * accuracy (the "Web Audio clock" pattern). Falls back gracefully if
 * Web MIDI is not available.
 *
 * @param bpm      - Current tempo in BPM
 * @param isPlaying - Whether the DAW transport is running
 */
export function useMIDIClock(
  bpm: number,
  isPlaying: boolean,
): UseMIDIClockReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<MIDIOutputInfo[]>([]);

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTickTimeRef = useRef(0);
  const runningRef = useRef(false);

  // Initialize Web MIDI
  useEffect(() => {
    if (!checkMIDISupport()) return;

    navigator.requestMIDIAccess({ sysex: false }).then(
      (access) => {
        midiAccessRef.current = access;
        const list: MIDIOutputInfo[] = [];
        access.outputs.forEach((o) => {
          list.push({
            id: o.id,
            name: o.name || "Unknown",
            manufacturer: o.manufacturer || "Unknown",
          });
        });
        setOutputs(list);
        if (list.length > 0) {
          setSelectedOutputId((prev) => prev ?? list[0].id);
        }

        access.onstatechange = () => {
          const updated: MIDIOutputInfo[] = [];
          access.outputs.forEach((o) => {
            updated.push({
              id: o.id,
              name: o.name || "Unknown",
              manufacturer: o.manufacturer || "Unknown",
            });
          });
          setOutputs(updated);
        };
      },
      () => {
        // MIDI access denied — fail silently
      },
    );

    return () => {
      if (midiAccessRef.current) {
        midiAccessRef.current.onstatechange = null;
      }
    };
  }, []);

  const getOutput = useCallback((): MIDIOutput | null => {
    if (!midiAccessRef.current || !selectedOutputId) return null;
    return midiAccessRef.current.outputs.get(selectedOutputId) ?? null;
  }, [selectedOutputId]);

  const sendByte = useCallback(
    (byte: number, timestamp?: number) => {
      const output = getOutput();
      if (!output) return;
      output.send([byte], timestamp);
    },
    [getOutput],
  );

  // Lookahead scheduler (Web Audio clock pattern)
  const schedule = useCallback(() => {
    if (!runningRef.current) return;

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const lookahead = 0.05; // 50ms
    const scheduleAhead = 0.1; // 100ms
    const now = ctx.currentTime;

    const tickInterval = 60 / (bpm * PPQN);

    while (nextTickTimeRef.current < now + scheduleAhead) {
      const absoluteMs = (nextTickTimeRef.current - now) * 1000 + performance.now();
      sendByte(MIDI_CLOCK, absoluteMs > 0 ? absoluteMs : undefined);
      nextTickTimeRef.current += tickInterval;
    }

    schedulerRef.current = setTimeout(schedule, lookahead * 1000);
  }, [bpm, sendByte]);

  const start = useCallback(() => {
    if (runningRef.current) return;

    // Get or create AudioContext for high-res clock
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    runningRef.current = true;
    setIsRunning(true);
    nextTickTimeRef.current = ctx.currentTime;
    sendByte(MIDI_START);
    schedule();
  }, [schedule, sendByte]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    if (schedulerRef.current !== null) {
      clearTimeout(schedulerRef.current);
      schedulerRef.current = null;
    }
    sendByte(MIDI_STOP);
  }, [sendByte]);

  // Sync with transport play/pause
  useEffect(() => {
    if (isPlaying && !runningRef.current) {
      start();
    } else if (!isPlaying && runningRef.current) {
      stop();
    }
  }, [isPlaying, start, stop]);

  // Cleanup
  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (schedulerRef.current !== null) {
        clearTimeout(schedulerRef.current);
      }
    };
  }, []);

  return {
    isRunning,
    selectedOutputId,
    outputs,
    start,
    stop,
    setOutputId: setSelectedOutputId,
  };
}
