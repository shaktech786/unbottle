/**
 * Smoke test verifying that the `audio-to-musicxml` package can be
 * imported and used from inside the Unbottle project. Runs the full
 * Basic Pitch model on a synthesized C major scale and confirms:
 *   1. The package's TS types resolve under Unbottle's tsconfig
 *   2. Transcription returns notes
 *   3. The toSequencerNotes() helper produces shapes compatible with
 *      Unbottle's tick-based Note type
 */

import { describe, it, expect } from "vitest";
import {
  transcribe,
  toSequencerNotes,
  generateMusicXml,
  encodeMidi,
} from "audio-to-musicxml";
import { PPQ } from "@/lib/music/types";

const SAMPLE_RATE = 22050;

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function synthSawtoothScale(midis: number[]): Float32Array {
  const noteDurationSec = 0.4;
  const gapSec = 0.1;
  const noteSamples = Math.floor(SAMPLE_RATE * noteDurationSec);
  const gapSamples = Math.floor(SAMPLE_RATE * gapSec);
  const out = new Float32Array(midis.length * (noteSamples + gapSamples));
  let cursor = 0;
  for (const midi of midis) {
    const period = SAMPLE_RATE / midiToFreq(midi);
    const attack = SAMPLE_RATE * 0.01;
    const release = SAMPLE_RATE * 0.05;
    for (let i = 0; i < noteSamples; i++) {
      const phase = (i % period) / period;
      let amp = 0.4;
      if (i < attack) amp *= i / attack;
      else if (i > noteSamples - release) amp *= (noteSamples - i) / release;
      out[cursor + i] = (2 * phase - 1) * amp;
    }
    cursor += noteSamples + gapSamples;
  }
  return out;
}

describe("audio-to-musicxml integration in Unbottle", () => {
  it(
    "transcribes a sawtooth scale and converts to Unbottle Note shape",
    async () => {
      const scaleMidis = [60, 62, 64, 65, 67, 69, 71, 72];
      const samples = synthSawtoothScale(scaleMidis);

      const result = await transcribe({ samples, sampleRate: SAMPLE_RATE });

      expect(result.notes.length).toBeGreaterThan(0);

      // Every detected note should have the right shape
      for (const n of result.notes) {
        expect(typeof n.midi).toBe("number");
        expect(typeof n.pitch).toBe("string");
        expect(n.startSeconds).toBeGreaterThanOrEqual(0);
        expect(n.durationSeconds).toBeGreaterThan(0);
      }

      // Convert to Unbottle's tick-based shape using PPQ=480
      const seqNotes = toSequencerNotes(result.notes, 120, PPQ, "smoke-track");
      expect(seqNotes.length).toBe(result.notes.length);
      for (const n of seqNotes) {
        expect(n.trackId).toBe("smoke-track");
        expect(typeof n.pitch).toBe("string");
        expect(n.startTick).toBeGreaterThanOrEqual(0);
        expect(n.durationTicks).toBeGreaterThan(0);
        expect(n.velocity).toBeGreaterThan(0);
        expect(n.velocity).toBeLessThanOrEqual(127);
      }

      // The MusicXML helper produces a real document
      const xml = result.toMusicXml({ title: "Unbottle Smoke", bpm: 120 });
      expect(xml).toContain("<score-partwise");
      expect(xml).toContain("<work-title>Unbottle Smoke</work-title>");

      // Standalone helpers also work
      const xml2 = generateMusicXml(result.notes, { title: "From helper" });
      expect(xml2).toContain("<work-title>From helper</work-title>");

      const midi = encodeMidi(result.notes, 120);
      expect(midi[0]).toBe(0x4d); // 'M'
      expect(midi[1]).toBe(0x54); // 'T'
    },
    120_000,
  );
});
