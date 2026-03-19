"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NoteName, Octave, Pitch } from "@/lib/music/types";

const NOTE_NAMES: NoteName[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

export interface MidiNoteEvent {
  pitch: Pitch;
  velocity: number;
  channel: number;
  timestamp: number;
  type: "noteon" | "noteoff";
}

export interface MidiInputInfo {
  id: string;
  name: string;
  manufacturer: string;
}

export interface UseMidiControllerReturn {
  isConnected: boolean;
  isSupported: boolean;
  midiInputs: MidiInputInfo[];
  selectedInput: string | null;
  setSelectedInput: (inputId: string | null) => void;
  lastNote: MidiNoteEvent | null;
  error: string | null;
}

function midiNumberToPitch(midiNumber: number): Pitch {
  const noteIndex = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  const clampedOctave = Math.max(0, Math.min(8, octave)) as Octave;
  return `${NOTE_NAMES[noteIndex]}${clampedOctave}` as Pitch;
}

/**
 * Check WebMIDI support synchronously (safe during SSR -- returns false).
 */
function checkMidiSupport(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.requestMIDIAccess === "function";
}

/**
 * React hook for WebMIDI input.
 */
export function useMidiController(): UseMidiControllerReturn {
  const supported = checkMidiSupport();

  const [isConnected, setIsConnected] = useState(false);
  const [midiInputs, setMidiInputs] = useState<MidiInputInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string | null>(null);
  const [lastNote, setLastNote] = useState<MidiNoteEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const midiAccessRef = useRef<MIDIAccess | null>(null);

  const refreshInputs = useCallback(() => {
    const access = midiAccessRef.current;
    if (!access) return;

    const inputs: MidiInputInfo[] = [];
    access.inputs.forEach((input) => {
      inputs.push({
        id: input.id,
        name: input.name || "Unknown Device",
        manufacturer: input.manufacturer || "Unknown",
      });
    });

    setMidiInputs(inputs);
    setIsConnected(inputs.length > 0);

    // Auto-select first input if none selected (uses functional updater to
    // avoid stale closure without needing a ref).
    if (inputs.length > 0) {
      setSelectedInput((prev) => prev ?? inputs[0].id);
    }
  }, []);

  // Initialize WebMIDI (only runs the async part if supported)
  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    navigator.requestMIDIAccess().then(
      (access) => {
        if (cancelled) return;
        midiAccessRef.current = access;
        refreshInputs();

        access.onstatechange = () => {
          refreshInputs();
        };
      },
      (err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to access MIDI devices",
        );
      },
    );

    return () => {
      cancelled = true;
    };
  }, [supported, refreshInputs]);

  // Handle MIDI messages from the selected input
  useEffect(() => {
    const access = midiAccessRef.current;
    if (!access || !selectedInput) return;

    const input = access.inputs.get(selectedInput);
    if (!input) return;

    function handleMessage(event: MIDIMessageEvent) {
      const data = event.data;
      if (!data || data.length < 3) return;

      const status = data[0] & 0xf0;
      const channel = data[0] & 0x0f;
      const noteNumber = data[1];
      const velocity = data[2];

      if (status === 0x90 || status === 0x80) {
        const isNoteOn = status === 0x90 && velocity > 0;

        setLastNote({
          pitch: midiNumberToPitch(noteNumber),
          velocity: isNoteOn ? velocity : 0,
          channel,
          timestamp: event.timeStamp,
          type: isNoteOn ? "noteon" : "noteoff",
        });
      }
    }

    input.onmidimessage = handleMessage;

    return () => {
      input.onmidimessage = null;
    };
  }, [selectedInput]);

  return {
    isConnected,
    isSupported: supported,
    midiInputs,
    selectedInput,
    setSelectedInput,
    lastNote,
    error,
  };
}
