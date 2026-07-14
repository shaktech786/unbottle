"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import {
  importAudioFile,
  isSupportedAudioFile,
} from "@/lib/audio/engine/audio-file-import";
import { ClipWaveform } from "@/components/daw/clip-waveform";
import { Spinner } from "@/components/ui/spinner";

export interface ReferenceDropZoneProps {
  /** Called when a reference track has been decoded. */
  onLoad?: (buffer: AudioBuffer, name: string) => void;
  className?: string;
}

/**
 * Drag-and-drop zone (or URL paste) for loading a reference audio track.
 * Accepts WAV, MP3, FLAC files or a direct audio URL.
 * Decodes via Web Audio and shows a waveform preview.
 */
export function ReferenceDropZone({ onLoad, className }: ReferenceDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isSupportedAudioFile(file)) {
        setError("Unsupported file. Use WAV, MP3, or FLAC.");
        return;
      }
      setError(null);
      setIsLoading(true);
      try {
        const result = await importAudioFile(file);
        setBuffer(result.buffer);
        setName(result.name);
        onLoad?.(result.buffer, result.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setIsLoading(false);
      }
    },
    [onLoad],
  );

  const handleUrl = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      setError(null);
      setIsLoading(true);
      try {
        const response = await fetch(trimmed);
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const ctx = new AudioContext();
        let decoded: AudioBuffer;
        try {
          decoded = await ctx.decodeAudioData(arrayBuffer);
        } finally {
          await ctx.close().catch(() => {});
        }
        const urlName = trimmed.split("/").pop()?.replace(/\?.*$/, "") ?? "reference";
        setBuffer(decoded);
        setName(urlName);
        setUrlInput("");
        setShowUrlInput(false);
        onLoad?.(decoded, urlName);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load URL");
      } finally {
        setIsLoading(false);
      }
    },
    [onLoad],
  );

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    // Only fire when leaving the drop zone entirely
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  function handleClear() {
    setBuffer(null);
    setName(null);
    setError(null);
  }

  if (buffer) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-300 truncate max-w-[180px]">
            {name}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900">
          <ClipWaveform
            buffer={buffer}
            width={240}
            height={48}
            color="#f59e0b"
            background="#111111"
          />
        </div>
        <p className="text-[10px] text-neutral-600">
          {buffer.duration.toFixed(1)}s · {buffer.numberOfChannels}ch · {buffer.sampleRate}Hz
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        ref={dropRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !showUrlInput && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed",
          "cursor-pointer px-4 py-6 text-center transition-colors",
          isDragging
            ? "border-amber-500 bg-amber-500/5"
            : "border-neutral-700 hover:border-neutral-500 bg-neutral-900/40",
        )}
      >
        {isLoading ? (
          <Spinner className="h-5 w-5 text-amber-400" />
        ) : (
          <>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-500"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-xs text-neutral-400">
              Drop audio file here
            </p>
            <p className="text-[10px] text-neutral-600">WAV · MP3 · FLAC</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.flac,audio/wav,audio/mpeg,audio/flac"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowUrlInput((v) => !v)}
        className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors text-left"
      >
        {showUrlInput ? "Cancel URL" : "or paste a URL"}
      </button>

      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleUrl(urlInput)}
            placeholder="https://example.com/track.mp3"
            className={cn(
              "flex-1 rounded-lg border border-neutral-700 bg-neutral-900",
              "px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600",
              "focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30",
            )}
          />
          <button
            type="button"
            onClick={() => void handleUrl(urlInput)}
            disabled={!urlInput.trim() || isLoading}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400 disabled:opacity-50"
          >
            Load
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
