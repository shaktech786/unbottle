"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioBufferStore } from "@/lib/audio/engine/audio-buffer-store";

export interface TrackRecorderState {
  isRecording: boolean;
  /** RMS level [0, 1] — updated ~30 fps while recording. */
  level: number;
  error: string | null;
}

export interface UseTrackRecorderReturn extends TrackRecorderState {
  /** Start recording from the microphone. */
  startRecording: () => Promise<void>;
  /**
   * Stop recording, decode to AudioBuffer, register in the buffer store,
   * and return the key used.
   */
  stopRecording: () => Promise<string | null>;
  /** Live AnalyserNode — available only while recording. */
  analyser: AnalyserNode | null;
}

/**
 * DAW-layer recording hook.
 *
 * Differences from the generic useAudioRecorder:
 *  - Decodes the captured blob to an AudioBuffer via Web Audio decodeAudioData
 *  - Registers the buffer in audioBufferStore under a generated key
 *  - Streams RMS level via an AnalyserNode for the live level meter
 */
export function useTrackRecorder(): UseTrackRecorderReturn {
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function stopLevelMeter() {
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = 0;
    }
  }

  function startLevelMeter(analyser: AnalyserNode) {
    const buf = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      setLevel(Math.min(1, rms * 4));
      levelRafRef.current = requestAnimationFrame(tick);
    };
    levelRafRef.current = requestAnimationFrame(tick);
  }

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.start(100);
      setIsRecording(true);
      startLevelMeter(analyser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mic access denied");
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    stopLevelMeter();
    setLevel(0);

    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") {
      setIsRecording(false);
      return null;
    }

    return new Promise((resolve) => {
      mr.onstop = async () => {
        setIsRecording(false);
        analyserRef.current = null;

        // Close scratch AudioContext
        if (audioCtxRef.current) {
          await audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }

        // Release mic
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;

        if (chunksRef.current.length === 0) {
          resolve(null);
          return;
        }

        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const arrayBuffer = await blob.arrayBuffer();
          const decodeCtx = new AudioContext();
          const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
          await decodeCtx.close().catch(() => {});

          const key = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          audioBufferStore.set(key, audioBuffer);
          resolve(key);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Decode failed");
          resolve(null);
        }
      };

      mr.stop();
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLevelMeter();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    isRecording,
    level,
    error,
    startRecording,
    stopRecording,
    analyser: analyserRef.current,
  };
}
