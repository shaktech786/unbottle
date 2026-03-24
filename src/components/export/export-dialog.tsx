"use client";

import { useState, useMemo, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExportProgress } from "./export-progress";
import { AudioPlayer } from "@/components/audio/audio-player";
import { useAudioGenerator } from "@/lib/hooks/use-audio-generator";
import { useElevenLabsKey } from "@/lib/hooks/use-elevenlabs-key";
import { useToast } from "@/components/ui/toast-provider";
import { useSessionContext } from "@/lib/session/context";
import { ticksToSeconds } from "@/lib/music/types";
import { renderSessionToAudio } from "@/lib/audio/offline-renderer";

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  trackIds?: string[];
  className?: string;
}

type ExportStatus = "idle" | "exporting" | "done" | "error";
type WavExportStatus = "idle" | "rendering" | "done" | "error";

export function ExportDialog({
  open,
  onClose,
  sessionId,
  trackIds,
  className,
}: ExportDialogProps) {
  const { addToast } = useToast();
  const { session, notes, tracks } = useSessionContext();
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // WAV export state
  const [wavStatus, setWavStatus] = useState<WavExportStatus>("idle");
  const [wavProgress, setWavProgress] = useState(0);
  const [wavDownloadUrl, setWavDownloadUrl] = useState<string | null>(null);
  const [wavError, setWavError] = useState<string | null>(null);

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

  // Estimate duration from notes
  const estimatedDuration = useMemo(() => {
    if (!session || notes.length === 0) return 0;
    const bpm = session.bpm || 120;
    let maxEndTick = 0;
    for (const note of notes) {
      const endTick = note.startTick + note.durationTicks;
      if (endTick > maxEndTick) maxEndTick = endTick;
    }
    // Add a small tail for release
    return ticksToSeconds(maxEndTick, bpm) + 0.5;
  }, [session, notes]);

  const durationLabel = useMemo(() => {
    if (estimatedDuration <= 0) return "";
    const mins = Math.floor(estimatedDuration / 60);
    const secs = Math.round(estimatedDuration % 60);
    if (mins > 0) return `~${mins}m ${secs}s`;
    return `~${secs}s`;
  }, [estimatedDuration]);

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
      addToast({ message: "Export complete", variant: "success", duration: 3000 });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Export failed",
      );
      setStatus("error");
      addToast({ message: "Export failed. Try again.", variant: "error" });
    }
  }

  const handleWavExport = useCallback(async () => {
    if (!session || notes.length === 0) {
      setWavError("No notes to export");
      setWavStatus("error");
      return;
    }

    setWavStatus("rendering");
    setWavProgress(0);
    setWavError(null);

    try {
      // Filter tracks if specific trackIds provided
      const activeTracks = trackIds
        ? tracks.filter((t) => trackIds.includes(t.id))
        : tracks;

      const activeNotes = trackIds
        ? notes.filter((n) => trackIds.includes(n.trackId))
        : notes;

      const bpm = session.bpm || 120;

      const blob = await renderSessionToAudio(
        activeNotes,
        activeTracks,
        bpm,
        estimatedDuration,
        (percent) => setWavProgress(percent),
      );

      const url = URL.createObjectURL(blob);
      setWavDownloadUrl(url);
      setWavStatus("done");
      addToast({ message: "WAV export complete", variant: "success", duration: 3000 });
    } catch (err) {
      setWavError(err instanceof Error ? err.message : "WAV export failed");
      setWavStatus("error");
      addToast({ message: "WAV export failed. Try again.", variant: "error" });
    }
  }, [session, notes, tracks, trackIds, estimatedDuration, addToast]);

  async function handleAudioGenerate() {
    await generateAudio({ sessionId, duration: 30, forceInstrumental: true });
  }

  function handleClose() {
    // Revoke blob URLs on close
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    if (wavDownloadUrl) {
      URL.revokeObjectURL(wavDownloadUrl);
      setWavDownloadUrl(null);
    }
    setStatus("idle");
    setErrorMessage(null);
    setWavStatus("idle");
    setWavProgress(0);
    setWavError(null);
    resetAudio();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Export" className={className}>
      <div className="flex flex-col gap-4">
        {/* MIDI export */}
        <div className="rounded-lg border border-neutral-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-neutral-200">MIDI File</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Standard MIDI file (.mid) compatible with any DAW
              </p>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500">
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

        {/* WAV Audio export */}
        <div className="rounded-lg border border-neutral-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-neutral-200">WAV Audio</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Render synthesized audio to WAV file
                {durationLabel && <span className="ml-1">({durationLabel})</span>}
              </p>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500">
              <path d="M2 10v3a1 1 0 001 1h2l3.5 3.5A.5.5 0 009.5 17V6a.5.5 0 00-.85-.36L5 9H3a1 1 0 00-1 1z" />
              <path d="M15.54 8.46a5 5 0 010 7.07" />
              <path d="M19.07 4.93a10 10 0 010 14.14" />
            </svg>
          </div>

          {wavStatus === "idle" && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleWavExport}
              disabled={notes.length === 0}
              className="w-full"
            >
              {notes.length === 0 ? "No notes to export" : "Export WAV"}
            </Button>
          )}

          {wavStatus === "rendering" && (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-500 border-t-amber-500" />
              <span className="text-xs text-neutral-400">
                Rendering audio... {wavProgress}%
              </span>
              <div className="w-full h-1 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${wavProgress}%` }}
                />
              </div>
            </div>
          )}

          {wavStatus === "done" && wavDownloadUrl && (
            <ExportProgress
              complete
              downloadUrl={wavDownloadUrl}
              filename={`unbottle-session-${sessionId}.wav`}
            />
          )}

          {wavStatus === "error" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-red-400">{wavError}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleWavExport}
                className="w-full"
              >
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* AI Audio generation */}
        <div className="rounded-lg border border-neutral-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-neutral-200">AI Audio</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Generate MP3 audio via ElevenLabs
              </p>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500">
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
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-500 border-t-amber-500" />
              <span className="text-xs text-neutral-400">
                {audioProgress || "Generating..."}
              </span>
              <div className="w-full h-1 rounded-full bg-neutral-800 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-amber-500 animate-pulse" />
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
