"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMidiController, type MidiNoteEvent } from "@/lib/hooks/use-midi-controller";
import type { RecordedMidiEvent } from "@/lib/midi/recorder";
import { initAudio, createInstrument } from "@/lib/audio/tone-setup";
import type { Pitch } from "@/lib/music/types";
import { cn } from "@/lib/utils/cn";

/** Minimal shape of the lazily-created preview instrument (a Tone node). */
interface PreviewInstrument {
  triggerAttack?: (pitch: string, time?: number, velocity?: number) => void;
  triggerRelease?: (pitch: string) => void;
  releaseAll?: () => void;
  dispose?: () => void;
}

export interface MidiRecordPanelProps {
  bpm: number;
  onCapture: (events: RecordedMidiEvent[]) => void;
  className?: string;
}

export function MidiRecordPanel({ bpm, onCapture, className }: MidiRecordPanelProps) {
  const [recording, setRecording] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [lastPitch, setLastPitch] = useState<Pitch | null>(null);

  const recordingRef = useRef(false);
  const bufferRef = useRef<RecordedMidiEvent[]>([]);
  const instRef = useRef<PreviewInstrument | null>(null);

  const handleNote = useCallback((e: MidiNoteEvent) => {
    const inst = instRef.current;
    if (inst) {
      try {
        if (e.type === "noteon") {
          inst.triggerAttack?.(e.pitch, undefined, e.velocity / 127);
        } else {
          inst.triggerRelease?.(e.pitch);
        }
      } catch {
        // Ignore individual note errors
      }
    }

    if (recordingRef.current) {
      bufferRef.current.push({
        pitch: e.pitch,
        velocity: e.velocity,
        type: e.type,
        timeMs: e.timestamp,
      });

      if (e.type === "noteon") {
        setNoteCount((c) => c + 1);
        setLastPitch(e.pitch);
      }
    }
  }, []);

  const { isSupported, midiInputs, selectedInput, setSelectedInput, error } =
    useMidiController({ onNote: handleNote });

  const handleRecordClick = useCallback(async () => {
    await initAudio();
    if (!instRef.current) {
      instRef.current = (await createInstrument("synth")) as PreviewInstrument;
    }
    bufferRef.current = [];
    setNoteCount(0);
    setLastPitch(null);
    recordingRef.current = true;
    setRecording(true);
  }, []);

  const handleStopClick = useCallback(() => {
    recordingRef.current = false;
    setRecording(false);
    if (bufferRef.current.length > 0) {
      onCapture([...bufferRef.current]);
    }
    bufferRef.current = [];
  }, [onCapture]);

  // Cleanup preview instrument on unmount
  useEffect(() => {
    return () => {
      recordingRef.current = false;
      const inst = instRef.current;
      if (inst) {
        try {
          inst.releaseAll?.();
        } catch {
          // ignore
        }
        try {
          inst.dispose?.();
        } catch {
          // ignore
        }
      }
      instRef.current = null;
    };
  }, []);

  if (!isSupported) {
    return (
      <div className={cn("rounded-lg border border-neutral-700 p-4", className)}>
        <h3 className="text-sm font-medium text-neutral-200 mb-1">MIDI Keyboard</h3>
        <p className="text-xs text-neutral-500">Web MIDI needs Chrome or Edge.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-neutral-700 p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-200">MIDI Keyboard</h3>
        <span className="text-xs text-neutral-500">{bpm} BPM</span>
      </div>

      {midiInputs.length === 0 ? (
        <p className="mb-3 text-xs text-neutral-500">
          No MIDI device — connect one and it&apos;ll appear.
        </p>
      ) : (
        <select
          value={selectedInput ?? ""}
          onChange={(e) => setSelectedInput(e.target.value || null)}
          className="mb-3 w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200"
        >
          {midiInputs.map((input) => (
            <option key={input.id} value={input.id}>
              {input.name}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={recording ? handleStopClick : handleRecordClick}
        disabled={midiInputs.length === 0}
        className={cn(
          "w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          recording
            ? "animate-pulse bg-red-500/20 text-red-400"
            : "bg-amber-500 text-[#0a0a0a] hover:bg-amber-400",
        )}
      >
        {recording ? "■ Stop" : "● Record"}
      </button>

      {recording && (
        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
          <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-red-500" />
          <span>{noteCount} notes</span>
          {lastPitch && <span className="text-neutral-500">· {lastPitch}</span>}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
