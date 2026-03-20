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
  isLoadingSamples: boolean;
}

export function useTonePlayer(
  notes: Note[],
  bpm: number,
  instrumentType: InstrumentType = "piano",
): UseTonePlayerReturn {
  const toneRef = useRef<ToneModule | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instrumentRef = useRef<any>(null);
  const scheduledIdsRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);
  const loadedTypeRef = useRef<InstrumentType | null>(null);
  const bpmRef = useRef(bpm);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);

  // Keep BPM ref current without triggering instrument re-creation
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Load Tone.js and create the instrument — ONLY when instrumentType changes
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const Tone = await import("tone");
      if (cancelled) return;
      toneRef.current = Tone;

      const transport = Tone.getTransport();
      transport.bpm.value = bpmRef.current;
      transport.PPQ = PPQ;

      // Only recreate instrument if the type actually changed
      if (loadedTypeRef.current === instrumentType && instrumentRef.current) {
        if (!cancelled) setIsReady(true);
        return;
      }

      // Disconnect old instrument (don't dispose — it's cached)
      if (instrumentRef.current) {
        try {
          instrumentRef.current.disconnect();
        } catch {
          // ignore
        }
        instrumentRef.current = null;
      }

      setIsLoadingSamples(true);

      try {
        const { createInstrument } = await import("@/lib/audio/tone-setup");
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
        if (cancelled) return;
        // Fall back to PolySynth
        const Tone2 = toneRef.current!;
        const fallback = new Tone2.PolySynth(Tone2.Synth).connect(
          Tone2.getDestination(),
        );
        instrumentRef.current = fallback;
        loadedTypeRef.current = "synth";
      }

      setIsLoadingSamples(false);
      if (!cancelled) setIsReady(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [instrumentType]); // Only instrumentType — NOT bpm

  // Update BPM on the transport without recreating anything
  const setBpm = useCallback((newBpm: number) => {
    bpmRef.current = newBpm;
    if (!toneRef.current) return;
    toneRef.current.getTransport().bpm.value = newBpm;
  }, []);

  const setPosition = useCallback((tick: number) => {
    // Always update visual playhead even if Tone isn't loaded yet
    setCurrentTick(tick);

    const Tone = toneRef.current;
    if (!Tone) return;

    const transport = Tone.getTransport();
    const wasPlaying = transport.state === "started";

    // Stop, seek, reschedule, restart
    if (wasPlaying) {
      transport.pause();
    }
    const seconds = ticksToSeconds(tick, transport.bpm.value);
    transport.seconds = seconds;

    if (wasPlaying) {
      transport.start();
    }
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
          instrument.triggerAttackRelease(
            note.pitch,
            durationSec,
            time,
            note.velocity / 127,
          );
        } catch {
          // Ignore individual note errors
        }
      }, startSec);

      scheduledIdsRef.current.push(id);
    }
  }, [notes]);

  // Track playhead position
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

    // Stop transport and cancel all scheduled events
    transport.stop();
    transport.cancel();
    transport.position = 0;

    // Release any currently sounding notes
    const instrument = instrumentRef.current;
    if (instrument) {
      try {
        if (typeof instrument.releaseAll === "function") {
          instrument.releaseAll();
        }
      } catch {
        // ignore
      }
    }

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
      if (instrumentRef.current) {
        try {
          if (typeof instrumentRef.current.releaseAll === "function") {
            instrumentRef.current.releaseAll();
          }
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
