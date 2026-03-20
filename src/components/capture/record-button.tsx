"use client";

import { useAudioRecorder } from "@/lib/hooks/use-audio-recorder";
import { cn } from "@/lib/utils/cn";
import { WaveformDisplay } from "./waveform-display";

export interface RecordButtonProps {
  onRecordingComplete: (blob: Blob, url: string) => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RecordButton({
  onRecordingComplete,
  className,
}: RecordButtonProps) {
  const {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    audioUrl,
    analyserNode,
    error,
    permissionState,
    recordingDuration,
  } = useAudioRecorder();

  async function handleClick() {
    if (isRecording) {
      await stopRecording();
      // onRecordingComplete is called via effect below
    } else {
      await startRecording();
    }
  }

  // When recording finishes and we have a blob, notify parent
  if (!isRecording && audioBlob && audioUrl) {
    // Schedule outside render to avoid calling during render
    queueMicrotask(() => {
      onRecordingComplete(audioBlob, audioUrl);
    });
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Main record button */}
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-full transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]",
          isRecording
            ? "bg-red-600 shadow-lg shadow-red-600/30"
            : "bg-red-600/80 hover:bg-red-600 hover:shadow-lg hover:shadow-red-600/20",
        )}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {/* Pulse animation when recording */}
        {isRecording && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-red-600 opacity-20" />
            <span className="absolute inset-[-4px] animate-pulse rounded-full border-2 border-red-500/40" />
          </>
        )}

        {/* Icon */}
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

      {/* Recording duration */}
      {isRecording && (
        <span className="text-sm font-mono text-red-400">
          {formatDuration(recordingDuration)}
        </span>
      )}

      {/* Status text */}
      {!isRecording && !error && (
        <span className="text-xs text-neutral-500">
          {permissionState === "denied"
            ? "Microphone access denied"
            : "Tap to record"}
        </span>
      )}

      {/* Waveform during recording */}
      {isRecording && analyserNode && (
        <WaveformDisplay analyserNode={analyserNode} isRecording={true} />
      )}

      {/* Error display */}
      {error && (
        <p className="text-xs text-red-400 text-center max-w-[200px]">
          {error}
        </p>
      )}
    </div>
  );
}
