"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePitchDetectorReturn {
  pitch: number | null;
  note: string | null;
  start: () => void;
  stop: () => void;
  isActive: boolean;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function frequencyToNoteName(freq: number): string {
  const midiNumber = 12 * Math.log2(freq / 440) + 69;
  const rounded = Math.round(midiNumber);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${Math.max(0, Math.min(8, octave))}`;
}

/**
 * Autocorrelation on a single analysis buffer.
 * Returns detected frequency in Hz, or null if no clear pitch.
 */
function autoCorrelate(buffer: Float32Array, sampleRate: number): number | null {
  const size = buffer.length;

  let rms = 0;
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return null;

  const correlations = new Float32Array(size);
  for (let lag = 0; lag < size; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) sum += buffer[i] * buffer[i + lag];
    correlations[lag] = sum;
  }

  let d = 0;
  while (d < size - 1 && correlations[d] > correlations[d + 1]) d++;

  let maxVal = -Infinity;
  let maxLag = -1;
  for (let i = d; i < size; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxLag = i;
    }
  }

  if (maxLag === -1 || maxVal < 0.1 * correlations[0]) return null;

  const prev = correlations[maxLag - 1] ?? 0;
  const curr = correlations[maxLag];
  const next = correlations[maxLag + 1] ?? 0;
  const shift = (prev - next) / (2 * (prev - 2 * curr + next));
  const refinedLag = maxLag + (Number.isFinite(shift) ? shift : 0);

  return sampleRate / refinedLag;
}

/**
 * Real-time pitch detection from the microphone using Web Audio AnalyserNode
 * and autocorrelation.
 *
 * Returns `{ pitch, note }` — updated continuously while active.
 * `pitch` is the detected frequency in Hz (or null for silence/noise).
 * `note` is the closest note name like "C4", "G#3", etc. (or null).
 */
export function usePitchDetector(): UsePitchDetectorReturn {
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setPitch(null);
    setNote(null);
    setIsActive(false);
  }, []);

  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;

        const buffer = new Float32Array(analyser.fftSize);

        const tick = () => {
          analyser.getFloatTimeDomainData(buffer);
          const freq = autoCorrelate(buffer, ctx.sampleRate);

          if (freq !== null && freq >= 50 && freq <= 5000) {
            setPitch(freq);
            setNote(frequencyToNoteName(freq));
          } else {
            setPitch(null);
            setNote(null);
          }
          rafRef.current = requestAnimationFrame(tick);
        };

        setIsActive(true);
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        setIsActive(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return { pitch, note, isActive, start, stop };
}
