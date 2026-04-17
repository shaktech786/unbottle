"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Note, Track, InstrumentType } from "@/lib/music/types";
import { PPQ, ticksToSeconds } from "@/lib/music/types";
import { routeNotesToTracks } from "@/lib/audio/note-router";
import { calculateEndTick } from "@/lib/audio/playback-utils";

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
  loopSection: (startTick: number, endTick: number) => void;
  clearLoop: () => void;
  isLooping: boolean;
}

/**
 * Per-track instrument state: the loaded Tone instrument plus
 * a Tone.Channel for volume/pan routing.
 */
interface TrackInstrumentEntry {
  instrumentType: InstrumentType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instrument: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: any;
}

export function useTonePlayer(
  notes: Note[],
  bpm: number,
  tracks: Track[],
): UseTonePlayerReturn {
  const toneRef = useRef<ToneModule | null>(null);
  const instrumentMapRef = useRef<Map<string, TrackInstrumentEntry>>(new Map());
  const scheduledIdsRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);
  const bpmRef = useRef(bpm);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const autoStopIdRef = useRef<number | null>(null);

  // Keep BPM ref current without triggering instrument re-creation
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Serialize track instrument assignments so we can detect changes
  // Format: "trackId:instrument,trackId:instrument,..."
  const tracksFingerprint = tracks
    .map((t) => `${t.id}:${t.instrument}`)
    .sort()
    .join(",");

  // Load Tone.js and create/cache instruments per track
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const Tone = await import("tone");
      if (cancelled) return;
      toneRef.current = Tone;

      const transport = Tone.getTransport();
      transport.bpm.value = bpmRef.current;
      transport.PPQ = PPQ;

      const { createInstrument } = await import("@/lib/audio/tone-setup");
      if (cancelled) return;

      // Determine which instruments we need
      const needed = new Map<string, InstrumentType>();
      for (const track of tracks) {
        needed.set(track.id, track.instrument);
      }

      const currentMap = instrumentMapRef.current;

      // Remove entries for tracks that no longer exist or changed instrument
      for (const [trackId, entry] of currentMap) {
        if (needed.get(trackId) !== entry.instrumentType) {
          try {
            entry.instrument.disconnect();
            entry.channel.dispose();
          } catch {
            // ignore
          }
          currentMap.delete(trackId);
        }
      }

      // Create instruments for new/changed tracks
      const loadPromises: Promise<void>[] = [];
      let anyLoading = false;

      for (const [trackId, instrumentType] of needed) {
        if (currentMap.has(trackId)) continue; // Already loaded with correct type

        anyLoading = true;

        const promise = (async () => {
          try {
            const instrument = await createInstrument(
              instrumentType,
              (loading: boolean) => {
                if (!cancelled) setIsLoadingSamples(loading);
              },
            );
            if (cancelled) return;

            // Create a Channel node for volume/pan routing
            const channel = new Tone.Channel().connect(Tone.getDestination());
            instrument.disconnect();
            instrument.connect(channel);

            currentMap.set(trackId, {
              instrumentType,
              instrument,
              channel,
            });
          } catch {
            if (cancelled) return;
            // Fallback to PolySynth
            const fallback = new Tone.PolySynth(Tone.Synth);
            const channel = new Tone.Channel().connect(Tone.getDestination());
            fallback.connect(channel);

            currentMap.set(trackId, {
              instrumentType: "synth",
              instrument: fallback,
              channel,
            });
          }
        })();

        loadPromises.push(promise);
      }

      if (anyLoading) {
        setIsLoadingSamples(true);
      }

      await Promise.all(loadPromises);

      if (!cancelled) {
        setIsLoadingSamples(false);
        setIsReady(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracksFingerprint]);

  // Update volume and pan on channels whenever track settings change
  useEffect(() => {
    const currentMap = instrumentMapRef.current;
    for (const track of tracks) {
      const entry = currentMap.get(track.id);
      if (!entry?.channel) continue;

      // Tone.Channel volume is in dB; convert linear 0-1 to dB
      // 0 -> -Infinity (mute), 1 -> 0dB
      const volumeDb = track.volume > 0 ? 20 * Math.log10(track.volume) : -Infinity;
      entry.channel.volume.value = volumeDb;
      entry.channel.pan.value = track.pan;
    }
  }, [tracks]);

  // Update BPM on the transport without recreating anything
  const setBpm = useCallback((newBpm: number) => {
    bpmRef.current = newBpm;
    if (!toneRef.current) return;
    toneRef.current.getTransport().bpm.value = newBpm;
  }, []);

  const setPosition = useCallback((tick: number) => {
    setCurrentTick(tick);

    const Tone = toneRef.current;
    if (!Tone) return;

    const transport = Tone.getTransport();
    const wasPlaying = transport.state === "started";

    if (wasPlaying) {
      transport.pause();
    }
    const seconds = ticksToSeconds(tick, transport.bpm.value);
    transport.seconds = seconds;

    if (wasPlaying) {
      transport.start();
    }
  }, []);

  // Schedule all notes on the transport, routed to correct instruments
  const scheduleNotes = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;

    const transport = Tone.getTransport();
    const currentMap = instrumentMapRef.current;

    // Clear previously scheduled events
    for (const id of scheduledIdsRef.current) {
      transport.clear(id);
    }
    scheduledIdsRef.current = [];

    // Route notes to tracks (handles mute/solo)
    const routed = routeNotesToTracks(notes, tracks);

    for (const [trackId, { notes: trackNotes }] of routed) {
      const entry = currentMap.get(trackId);
      if (!entry) continue;

      const { instrument } = entry;

      for (const note of trackNotes) {
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
    }
  }, [notes, tracks]);

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

    // Clear any previous auto-stop
    if (autoStopIdRef.current !== null) {
      transport.clear(autoStopIdRef.current);
      autoStopIdRef.current = null;
    }

    // Schedule auto-stop at end of last note (only when not looping)
    if (!transport.loop) {
      const endTick = calculateEndTick(notes);
      if (endTick > 0) {
        const endSec = ticksToSeconds(endTick, transport.bpm.value);
        autoStopIdRef.current = transport.schedule(() => {
          transport.stop();
          transport.position = 0;
          setIsPlaying(false);
          setCurrentTick(0);
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          }
        }, endSec);
      }
    }

    transport.start();
    setIsPlaying(true);
    startPositionTracking();
  }, [scheduleNotes, startPositionTracking, isLoadingSamples, notes]);

  const loopSection = useCallback((startTick: number, endTick: number) => {
    const Tone = toneRef.current;
    if (!Tone) return;

    const transport = Tone.getTransport();
    const startSec = ticksToSeconds(startTick, transport.bpm.value);
    const endSec = ticksToSeconds(endTick, transport.bpm.value);

    transport.loopStart = startSec;
    transport.loopEnd = endSec;
    transport.loop = true;
    setIsLooping(true);

    // Clear auto-stop when looping is active
    if (autoStopIdRef.current !== null) {
      transport.clear(autoStopIdRef.current);
      autoStopIdRef.current = null;
    }
  }, []);

  const clearLoop = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;

    const transport = Tone.getTransport();
    transport.loop = false;
    setIsLooping(false);
  }, []);

  const stop = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;

    const transport = Tone.getTransport();

    // Clear auto-stop event
    if (autoStopIdRef.current !== null) {
      transport.clear(autoStopIdRef.current);
      autoStopIdRef.current = null;
    }

    transport.stop();
    transport.cancel();
    transport.position = 0;

    // Release any currently sounding notes on all instruments
    const currentMap = instrumentMapRef.current;
    for (const [, entry] of currentMap) {
      try {
        if (typeof entry.instrument.releaseAll === "function") {
          entry.instrument.releaseAll();
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
    const mapRef = instrumentMapRef;
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (toneRef.current) {
        const transport = toneRef.current.getTransport();
        transport.stop();
        transport.cancel();
      }
      scheduledIdsRef.current = [];
      autoStopIdRef.current = null;
      const currentMap = mapRef.current;
      for (const [, entry] of currentMap) {
        try {
          if (typeof entry.instrument.releaseAll === "function") {
            entry.instrument.releaseAll();
          }
          entry.instrument.disconnect();
          entry.channel.dispose();
        } catch {
          // ignore
        }
      }
      currentMap.clear();
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
    loopSection,
    clearLoop,
    isLooping,
  };
}
