"use client";

import { useCallback, useRef, useState } from "react";
import { filterAudioFiles } from "@/lib/audio/engine/audio-file-import";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AudioImportZoneProps {
  /** Called with each valid audio File the user drops or picks. */
  onFiles: (files: File[]) => void;
  /** Whether an import is currently in progress (shows spinner). */
  importing?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AudioImportZone({ onFiles, importing = false, className }: AudioImportZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (raw: FileList | File[]) => {
      const audio = filterAudioFiles(raw);
      if (audio.length > 0) onFiles(audio);
    },
    [onFiles],
  );

  // ── Drag & drop ────────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  // ── File input ─────────────────────────────────────────────────────────────

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Import audio file"
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed",
        "px-4 py-3 text-center cursor-pointer transition-colors select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        isDragging
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-neutral-700 bg-neutral-900 hover:border-neutral-600 hover:bg-neutral-800/60",
        importing && "opacity-60 pointer-events-none",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
      }}
    >
      {importing ? (
        <span className="text-xs text-neutral-400">Importing…</span>
      ) : (
        <>
          {/* Simple audio icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-neutral-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          <span className="text-xs text-neutral-400">
            Drop WAV / MP3 / FLAC or{" "}
            <span className="text-indigo-400 underline underline-offset-2">browse</span>
          </span>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.flac,audio/wav,audio/mpeg,audio/flac"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={handleChange}
      />
    </div>
  );
}
