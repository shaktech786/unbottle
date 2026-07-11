/**
 * Pure conversion of raw MIDI note-on/note-off events (as captured live from
 * a WebMIDI input) into sequencer Notes. No React/Tone/DOM dependency —
 * mirrors the ms-to-tick conversion in `hum-to-midi.ts#segmentsToNotes`.
 */

import type { Note, Pitch } from "@/lib/music/types";
import { PPQ } from "@/lib/music/types";

export interface RecordedMidiEvent {
  pitch: Pitch;
  velocity: number; // 0-127 (0 for note-off)
  type: "noteon" | "noteoff";
  timeMs: number; // monotonic, e.g. from event.timeStamp
}

export interface MidiToNotesOptions {
  trackId: string;
  bpm: number;
  /** Optional grid snap in ticks, e.g. PPQ/4 */
  quantizeTicks?: number;
  /** Time of record end, used to close still-held notes */
  endMs?: number;
}

interface OpenNoteOn {
  velocity: number;
  timeMs: number;
}

/** Snap a tick value to the nearest multiple of `grid`. */
function quantize(tick: number, grid: number): number {
  return Math.round(tick / grid) * grid;
}

/**
 * Convert recorded MIDI note-on/note-off events into Note objects targeting
 * a specific track. Note IDs are NOT assigned — the caller must add them.
 */
export function midiEventsToNotes(
  events: RecordedMidiEvent[],
  opts: MidiToNotesOptions,
): Omit<Note, "id">[] {
  if (events.length === 0) return [];

  const sorted = events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.timeMs - b.event.timeMs || a.index - b.index)
    .map(({ event }) => event);

  const baseMs = Math.min(...sorted.map((e) => e.timeMs));
  const maxMs = Math.max(...sorted.map((e) => e.timeMs));
  const closeMs = opts.endMs ?? maxMs;

  const ticksPerMs = (opts.bpm / 60 / 1000) * PPQ;
  const quantizeTicks = opts.quantizeTicks;

  const openByPitch = new Map<Pitch, OpenNoteOn[]>();
  const notes: Omit<Note, "id">[] = [];

  function buildNote(pitch: Pitch, onMs: number, offMs: number, velocity: number): Omit<Note, "id"> {
    let startTick = Math.round((onMs - baseMs) * ticksPerMs);
    let durationTicks = Math.max(1, Math.round((offMs - onMs) * ticksPerMs));

    if (quantizeTicks && quantizeTicks > 0) {
      startTick = quantize(startTick, quantizeTicks);
      durationTicks = Math.max(1, Math.max(quantizeTicks, durationTicks));
    }

    return {
      trackId: opts.trackId,
      pitch,
      startTick,
      durationTicks,
      velocity: Math.max(1, Math.min(127, Math.round(velocity))),
    };
  }

  for (const event of sorted) {
    if (event.type === "noteon") {
      const open = openByPitch.get(event.pitch) ?? [];
      open.push({ velocity: event.velocity, timeMs: event.timeMs });
      openByPitch.set(event.pitch, open);
    } else {
      const open = openByPitch.get(event.pitch);
      const pending = open?.shift();
      if (pending) {
        notes.push(buildNote(event.pitch, pending.timeMs, event.timeMs, pending.velocity));
      }
    }
  }

  // Close any note-ons that never received a matching note-off.
  for (const [pitch, open] of openByPitch) {
    for (const pending of open) {
      notes.push(buildNote(pitch, pending.timeMs, closeMs, pending.velocity));
    }
  }

  return notes;
}
