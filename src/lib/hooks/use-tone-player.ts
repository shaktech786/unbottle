"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Note, InstrumentType } from "@/lib/music/types";
import { PPQ, ticksToSeconds } from "@/lib/music/types";

type ToneModule = typeof import("tone");

export interface UseTonePlayerReturn {
  isPlaying: boolean;
  play: () => Promise<void>;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setPosition: (tick: number) => void;
  currentTick: number;
  isReady: boolean;
  /** True while instrument samples are being downloaded */
  isLoadingSamples: boolean;
}

/**
 * React hook for Tone.js playback.
 *
 * Manages Transport state, schedules notes for playback, and
 * reports the current playhead position.
 *
 * Handles both sample-based instruments (Tone.Sampler) and basic synths.
 * Exposes `isLoadingSamples` so the UI can show loading state.
 *
 * @param notes - Array of notes to schedule
 * @param bpm - Initial tempo
 * @param instrumentType - Instrument type for playback
 */
export function useTonePlayer(
  notes: Note[],
  bpm: number,
  instrumentType: InstrumentType = "synth",
): UseTonePlayerReturn {
  const toneRef = useRef<ToneModule | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instrumentRef = useRef<any>(null);
  const scheduledIdsRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);
  /** Track which instrument type is currently loaded to detect changes */
  const loadedTypeRef = useRef<InstrumentType | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);

  // Load Tone.js and create the instrument
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const Tone = await import("tone");
      if (cancelled) return;
      toneRef.current = Tone;

      const { createInstrument } = await import("@/lib/audio/tone-setup");

      // Dispose old instrument if switching types
      if (
        instrumentRef.current &&
        loadedTypeRef.current !== instrumentType &&
        instrumentRef.current.dispose
      ) {
        // Don't dispose -- it's cached by tone-setup. Just disconnect.
        try {
          instrumentRef.current.disconnect();
        } catch {
          // ignore if already disconnected
        }
        instrumentRef.current = null;
      }

      setIsLoadingSamples(true);

      try {
        const instrument = await createInstrument(
          instrumentType,
          (loading: boolean) => {
            if (!cancelled) setIsLoadingSamples(loading);
          },
        );

        if (cancelled) return;

        instrumentRef.current = instrument;
        loadedTypeRef.current = instrumentType;
      } catch {
        // On failure, fall back to basic synth
        if (cancelled) return;
        const fallback = new Tone.PolySynth(Tone.Synth).connect(Tone.getDestination());
        instrumentRef.current = fallback;
        loadedTypeRef.current = "synth";
      }

      setIsLoadingSamples(false);

      const transport = Tone.getTransport();
      transport.bpm.value = bpm;
      transport.PPQ = PPQ;

      if (!cancelled) setIsReady(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [instrumentType, bpm]);

  // Update BPM when it changes
  const setBpm = useCallback(
    (newBpm: number) => {
      if (!toneRef.current) return;
      toneRef.current.getTransport().bpm.value = newBpm;
    },
    [],
  );

  // Set playhead position
  const setPosition = useCallback((tick: number) => {
    if (!toneRef.current) return;
    const transport = toneRef.current.getTransport();
    const seconds = ticksToSeconds(tick, transport.bpm.value);
    transport.seconds = seconds;
    setCurrentTick(tick);
  }, []);

  // Schedule all notes on the transport
  const scheduleNotes = useCallback(() => {
    const Tone = toneRef.current;
    const instrument = instrumentRef.current;
    if (!Tone || !instrument) return;

    const transport = Tone.getTransport();

    // Clear previously scheduled events
    for (const id of scheduledIdsRef.current) {
      transport.clear(id);
    }
    scheduledIdsRef.current = [];

    for (const note of notes) {
      const startSec = ticksToSeconds(note.startTick, transport.bpm.value);
      const durationSec = ticksToSeconds(
        note.durationTicks,
        transport.bpm.value,
      );

      const id = transport.schedule((time: number) => {
        try {
          if (typeof instrument.triggerAttackRelease === "function") {
            instrument.triggerAttackRelease(
              note.pitch,
              durationSec,
              time,
              note.velocity / 127,
            );
          }
        } catch {
          // Ignore playback errors for individual notes
        }
      }, startSec);

      scheduledIdsRef.current.push(id);
    }
  }, [notes]);

  // Track playhead position with requestAnimationFrame
  const startPositionTracking = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;

    const transport = Tone.getTransport();

    function tick() {
      const seconds = transport.seconds;
      const bpmVal = transport.bpm.value;
      const tickPos = Math.floor((seconds / 60) * bpmVal * PPQ);
      setCurrentTick(tickPos);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const play = useCallback(async () => {
    const Tone = toneRef.current;
    if (!Tone || isLoadingSamples) return;

    // Ensure context is running (autoplay policy)
    await Tone.start();

    scheduleNotes();

    const transport = Tone.getTransport();
    transport.start();
    setIsPlaying(true);
    startPositionTracking();
  }, [scheduleNotes, startPositionTracking, isLoadingSamples]);

  const stop = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;

    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0;
    setIsPlaying(false);
    setCurrentTick(0);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (toneRef.current) {
        const transport = toneRef.current.getTransport();
        transport.stop();
        transport.cancel();
      }
      // Disconnect (don't dispose -- cached instruments are reusable)
      if (instrumentRef.current) {
        try {
          instrumentRef.current.disconnect();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isPlaying,
    play,
    stop,
    setBpm,
    setPosition,
    currentTick,
    isReady,
    isLoadingSamples,
  };
}
