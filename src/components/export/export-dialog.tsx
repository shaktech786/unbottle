"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExportProgress } from "./export-progress";
import { AudioPlayer } from "@/components/audio/audio-player";
import { useAudioGenerator } from "@/lib/hooks/use-audio-generator";
import { useElevenLabsKey } from "@/lib/hooks/use-elevenlabs-key";

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  trackIds?: string[];
  className?: string;
}

type ExportStatus = "idle" | "exporting" | "done" | "error";

export function ExportDialog({
  open,
  onClose,
  sessionId,
  trackIds,
  className,
}: ExportDialogProps) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio generation
  const { apiKey: elevenLabsKey } = useElevenLabsKey();
  const {
    generate: generateAudio,
    isGenerating: isAudioGenerating,
    progress: audioProgress,
    audioUrl: generatedAudioUrl,
    error: audioError,
    reset: resetAudio,
  } = useAudioGenerator(elevenLabsKey);

  async function handleMidiExport() {
    setStatus("exporting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/midi/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, trackIds }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Export failed",
      );
      setStatus("error");
    }
  }

  async function handleAudioGenerate() {
    await generateAudio({ sessionId, duration: 30, forceInstrumental: true });
  }

  function handleClose() {
    // Revoke blob URL on close
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setStatus("idle");
    setErrorMessage(null);
    resetAudio();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Export" className={className}>
      <div className="flex flex-col gap-4">
        {/* MIDI export */}
        <div className="rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-slate-200">MIDI File</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard MIDI file (.mid) compatible with any DAW
              </p>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <rect x="5" y="10" width="2" height="8" fill="currentColor" />
              <rect x="9" y="8" width="2" height="10" fill="currentColor" />
              <rect x="13" y="10" width="2" height="8" fill="currentColor" />
              <rect x="17" y="6" width="2" height="12" fill="currentColor" />
            </svg>
          </div>

          {status === "idle" && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleMidiExport}
              className="w-full"
            >
              Export MIDI
            </Button>
          )}

          {status === "exporting" && <ExportProgress />}

          {status === "done" && downloadUrl && (
            <ExportProgress
              complete
              downloadUrl={downloadUrl}
              filename={`unbottle-session-${sessionId}.mid`}
            />
          )}

          {status === "error" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-red-400">{errorMessage}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMidiExport}
                className="w-full"
              >
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* AI Audio generation */}
        <div className="rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-slate-200">AI Audio</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate MP3 audio via ElevenLabs
              </p>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>

          {!isAudioGenerating && !generatedAudioUrl && !audioError && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleAudioGenerate}
              className="w-full"
            >
              Generate Audio
            </Button>
          )}

          {isAudioGenerating && (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
              <span className="text-xs text-slate-400">
                {audioProgress || "Generating..."}
              </span>
              <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-indigo-500 animate-pulse" />
              </div>
            </div>
          )}

          {generatedAudioUrl && (
            <div className="flex flex-col gap-2">
              <AudioPlayer
                src={generatedAudioUrl}
                filename={`unbottle-session-${sessionId}.mp3`}
              />
            </div>
          )}

          {audioError && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-red-400">{audioError}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAudioGenerate}
                className="w-full"
              >
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* Close */}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
