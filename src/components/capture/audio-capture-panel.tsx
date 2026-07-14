"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useTrackRecorder } from "@/lib/hooks/use-track-recorder";
import { usePitchDetector } from "@/lib/hooks/use-pitch-detector";
import { StreamingClipWaveform } from "@/components/daw/clip-waveform";
import { StreamingWaveform } from "@/lib/audio/engine/waveform-renderer";
import { audioBufferStore } from "@/lib/audio/engine/audio-buffer-store";

export interface AudioCapturePanelProps {
  /** Called when a recording is saved — passes the buffer store key. */
  onSave?: (bufferKey: string) => void;
  className?: string;
}

/**
 * MAIN-90 — Audio capture UI with live streaming waveform and pitch display.
 *
 * Uses useTrackRecorder for DAW-layer recording (decodes to AudioBuffer,
 * registers in audioBufferStore) and StreamingClipWaveform for the live
 * waveform. Pitch detection runs in parallel while recording.
 */
export function AudioCapturePanel({ onSave, className }: AudioCapturePanelProps) {
  const { isRecording, startRecording, stopRecording, analyser, error } =
    useTrackRecorder();

  const pitchDetector = usePitchDetector();
  const streamingWaveformRef = useRef<StreamingWaveform>(
    new StreamingWaveform(240),
  );
  const [bufferKey, setBufferKey] = useState<string | null>(null);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const rafRef = useRef<number>(0);

  // Feed analyser data into the streaming waveform
  useEffect(() => {
    if (!isRecording || !analyser) return;

    const buf = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      streamingWaveformRef.current.push(buf);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRecording, analyser]);

  // Start/stop pitch detection alongside recording
  useEffect(() => {
    if (isRecording) {
      pitchDetector.start();
    } else {
      pitchDetector.stop();
    }
  }, [isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track latest detected note while recording
  useEffect(() => {
    if (isRecording) {
      setDetectedNote(pitchDetector.note);
    }
  }, [isRecording, pitchDetector.note]);

  async function handleToggle() {
    if (isRecording) {
      const key = await stopRecording();
      if (key) {
        setBufferKey(key);
      }
      streamingWaveformRef.current.reset();
    } else {
      setBufferKey(null);
      setDetectedNote(null);
      streamingWaveformRef.current.reset();
      await startRecording();
    }
  }

  function handleSave() {
    if (!bufferKey) return;
    onSave?.(bufferKey);
    setBufferKey(null);
    setDetectedNote(null);
  }

  function handleDiscard() {
    if (bufferKey) {
      audioBufferStore.delete(bufferKey);
    }
    setBufferKey(null);
    setDetectedNote(null);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Mic button */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => void handleToggle()}
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]",
            isRecording
              ? "bg-red-600 shadow-lg shadow-red-600/30"
              : "bg-red-600/80 hover:bg-red-600 hover:shadow-lg hover:shadow-red-600/20",
          )}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-red-600 opacity-20" />
              <span className="absolute inset-[-4px] animate-pulse rounded-full border-2 border-red-500/40" />
            </>
          )}
          {isRecording ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        {/* Detected note badge */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">
              {detectedNote ? "Detected:" : "Listening..."}
            </span>
            {detectedNote && (
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
                {detectedNote}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Live streaming waveform */}
      {isRecording && (
        <div className="rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900">
          <StreamingClipWaveform
            streaming={streamingWaveformRef.current}
            width={240}
            height={48}
            color="#ef4444"
            background="#111111"
          />
        </div>
      )}

      {/* Save / discard actions after recording */}
      {bufferKey && !isRecording && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-400 text-center">Recording captured</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-400 transition-colors"
            >
              Save to session
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}

      {!isRecording && !bufferKey && (
        <p className="text-xs text-neutral-500 text-center">Tap to start recording</p>
      )}
    </div>
  );
}
