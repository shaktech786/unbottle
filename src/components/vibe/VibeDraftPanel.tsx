"use client";

/**
 * VibeDraftPanel — one-click "Generate Draft" from vibe to playable DAW session.
 * MAIN-55: Assembles chords + drum pattern + melody into full session tracks.
 *
 * Creates:
 *   - Drum track (grid from generateDrumPattern)
 *   - Chord track (Synth, notes from chord symbols)
 *   - Melody track (PianoRoll notes from AI)
 */

import { useState } from "react";
import { VibeInputForm } from "./VibeInputForm";
import { generateDrumPattern } from "@/lib/vibe/drum-pattern";
import type { VibeInput } from "@/lib/vibe/schema";
import type { Note } from "@/lib/music/types";
import type { DrumGrid } from "@/lib/audio/drum-sequencer-engine";
import { PPQ } from "@/lib/music/types";

interface GeneratedDraft {
  chords: string[];
  key: string;
  bpm: number;
  drumGrid: DrumGrid;
  melodyNotes: Omit<Note, "id">[];
  chordNotes: Omit<Note, "id">[];
}

interface VibeDraftPanelProps {
  /** Called when the draft is assembled and ready to load into the DAW. */
  onDraftReady: (draft: GeneratedDraft) => void;
  /** Track IDs to use; if not provided, generic IDs are used. */
  drumTrackId?: string;
  chordTrackId?: string;
  melodyTrackId?: string;
  className?: string;
}

// Simple chord-to-note mapping for chord track preview
// Each chord gets one root note voicing at octave 4
const NOTE_SEMITONES: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4,
  F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9,
  "A#": 10, Bb: 10, B: 11,
};

function chordSymbolToNotes(
  chord: string,
  startTick: number,
  durationTicks: number,
  trackId: string,
): Omit<Note, "id">[] {
  // Parse root: 1 or 2 chars (with optional #/b)
  const rootMatch = chord.match(/^([A-G][#b]?)/);
  if (!rootMatch) return [];
  const root = rootMatch[1];
  const semitone = NOTE_SEMITONES[root] ?? 0;
  const midiBase = 48 + semitone; // C4 = 60, so C3 = 48

  const isMinor = /m(?!aj)/.test(chord.slice(root.length));
  const third = isMinor ? midiBase + 3 : midiBase + 4;
  const fifth = midiBase + 7;

  // Convert midi number to pitch string
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function midiToPitch(midi: number): Note["pitch"] {
    const octave = Math.floor(midi / 12) - 1;
    const name = noteNames[midi % 12];
    return `${name}${octave}` as Note["pitch"];
  }

  return [
    { trackId, pitch: midiToPitch(midiBase), startTick, durationTicks, velocity: 75 },
    { trackId, pitch: midiToPitch(third), startTick, durationTicks, velocity: 65 },
    { trackId, pitch: midiToPitch(fifth), startTick, durationTicks, velocity: 60 },
  ];
}

function buildChordNotes(
  chords: string[],
  bpm: number,
  trackId: string,
): Omit<Note, "id">[] {
  const beatsPerChord = 4; // 1 bar each
  const ticksPerChord = beatsPerChord * PPQ;
  const notes: Omit<Note, "id">[] = [];

  for (let i = 0; i < chords.length; i++) {
    const startTick = i * ticksPerChord;
    const chordNotes = chordSymbolToNotes(
      chords[i],
      startTick,
      ticksPerChord - Math.round(PPQ / 4), // small gap between chords
      trackId,
    );
    notes.push(...chordNotes);
  }

  return notes;
}

type Step = "idle" | "chords" | "melody" | "done" | "error";

export function VibeDraftPanel({
  onDraftReady,
  drumTrackId = "drum-track",
  chordTrackId = "chord-track",
  melodyTrackId = "melody-track",
  className,
}: VibeDraftPanelProps) {
  const [step, setStep] = useState<Step>("idle");
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleVibeSubmit(vibe: VibeInput) {
    setError(null);
    setStep("chords");
    setStepLabel("Generating chord progression...");

    try {
      // Step 1: Get chords from AI
      const chordsRes = await fetch("/api/vibe/chords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vibe),
      });

      if (!chordsRes.ok) {
        const data = await chordsRes.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Chord generation failed (${chordsRes.status})`);
      }

      const { chords, key, bpm } = await chordsRes.json() as {
        chords: string[];
        key: string;
        bpm: number;
      };

      // Step 2: Generate drum pattern (rule-based, instant)
      const genre = vibe.genre ?? "";
      const { grid: drumGrid } = generateDrumPattern(vibe.energy, genre);

      // Step 3: Build chord notes locally
      const chordNotes = buildChordNotes(chords, bpm, chordTrackId);

      // Step 4: Get melody from AI
      setStep("melody");
      setStepLabel("Sketching melody...");

      const melodyRes = await fetch("/api/vibe/melody", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe, chords, key, bpm, trackId: melodyTrackId }),
      });

      let melodyNotes: Omit<Note, "id">[] = [];
      if (melodyRes.ok) {
        const data = await melodyRes.json() as { notes?: Omit<Note, "id">[] };
        melodyNotes = data.notes ?? [];
      }
      // Melody failure is non-fatal — we still deliver chords + drums

      setStep("done");
      setStepLabel("Draft ready!");

      onDraftReady({
        chords,
        key,
        bpm,
        drumGrid,
        melodyNotes,
        chordNotes,
      });
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  }

  const isLoading = step === "chords" || step === "melody";

  return (
    <div className={className}>
      {(step === "idle" || step === "done" || step === "error") && (
        <VibeInputForm onSubmit={handleVibeSubmit} isLoading={false} />
      )}

      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-neutral-300">{stepLabel}</p>
          <p className="text-xs text-neutral-500">This may take a few seconds</p>
        </div>
      )}

      {step === "done" && (
        <div className="mt-3 rounded-lg bg-green-900/30 border border-green-700/40 px-4 py-3 text-sm text-green-300">
          Draft generated — tracks are now loaded in the DAW.
        </div>
      )}

      {step === "error" && error && (
        <div className="mt-3 rounded-lg bg-red-900/30 border border-red-700/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
