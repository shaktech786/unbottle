"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExportProgress } from "./export-progress";

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

  function handleClose() {
    // Revoke blob URL on close
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setStatus("idle");
    setErrorMessage(null);
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

        {/* Audio export (coming soon) */}
        <div className="rounded-lg border border-slate-800 p-4 opacity-50">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-medium text-slate-400">Audio File</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                WAV / MP3 audio bounce
              </p>
            </div>
            <span className="text-[10px] font-medium text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          </div>
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
