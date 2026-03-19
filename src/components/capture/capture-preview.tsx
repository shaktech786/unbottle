"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { WaveformDisplay } from "./waveform-display";

export interface CapturePreviewProps {
  audioUrl: string | null;
  transcription?: string | null;
  onAddToSession: () => void;
  onDiscard: () => void;
  className?: string;
}

/**
 * Preview of captured audio with playback controls.
 */
export function CapturePreview({
  audioUrl,
  transcription,
  onAddToSession,
  onDiscard,
  className,
}: CapturePreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function togglePlayback() {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  }

  function handleEnded() {
    setIsPlaying(false);
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700 bg-slate-900/80 p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Preview
        </h4>
      </div>

      {/* Audio element (hidden) */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleEnded}
          preload="metadata"
        />
      )}

      {/* Play button + waveform */}
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={!audioUrl}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            "bg-indigo-600 text-white transition-colors",
            "hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <WaveformDisplay
          audioUrl={audioUrl}
          width={180}
          height={40}
          className="flex-1"
        />
      </div>

      {/* AI transcription */}
      {transcription && (
        <div className="mb-3 rounded-lg bg-slate-800/50 p-2">
          <span className="text-xs text-slate-500 block mb-1">
            AI Transcription
          </span>
          <p className="text-xs text-slate-300">{transcription}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onDiscard} className="flex-1">
          Discard
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onAddToSession}
          className="flex-1"
        >
          Add to Session
        </Button>
      </div>
    </div>
  );
}
