"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { RecordButton } from "./record-button";
import { TapPad } from "./tap-pad";
import { CapturePreview } from "./capture-preview";
import { DescribeInput } from "./describe-input";

type CaptureTab = "record" | "tap" | "describe";

interface CaptureEntry {
  id: string;
  type: CaptureTab;
  audioUrl?: string;
  audioBlob?: Blob;
  textDescription?: string;
  bpm?: number;
  createdAt: Date;
}

export interface CapturePanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddToSession?: (entry: CaptureEntry) => void;
  /**
   * Called when the user clicks "Transcribe to MIDI" on a recorded blob.
   * The host is responsible for running pitch detection, creating notes,
   * and clearing the preview by returning. When provided, the preview
   * shows a "Transcribe to MIDI" action alongside "Save Audio".
   */
  onTranscribeToMidi?: (blob: Blob) => Promise<void> | void;
  className?: string;
}

export function CapturePanel({
  collapsed = false,
  onToggleCollapse,
  onAddToSession,
  onTranscribeToMidi,
  className,
}: CapturePanelProps) {
  const [activeTab, setActiveTab] = useState<CaptureTab>("record");
  const [captures, setCaptures] = useState<CaptureEntry[]>([]);
  const [previewEntry, setPreviewEntry] = useState<CaptureEntry | null>(null);

  const tabs: { key: CaptureTab; label: string }[] = [
    { key: "record", label: "Record" },
    { key: "tap", label: "Tap" },
    { key: "describe", label: "Describe" },
  ];

  function handleRecordingComplete(blob: Blob, url: string) {
    const entry: CaptureEntry = {
      id: `cap_${Date.now()}`,
      type: "record",
      audioBlob: blob,
      audioUrl: url,
      createdAt: new Date(),
    };
    setPreviewEntry(entry);
  }

  function handleTapComplete(bpm: number) {
    const entry: CaptureEntry = {
      id: `cap_${Date.now()}`,
      type: "tap",
      bpm,
      createdAt: new Date(),
    };
    setCaptures((prev) => [entry, ...prev]);
    onAddToSession?.(entry);
  }

  function handleDescribeSubmit(text: string) {
    const entry: CaptureEntry = {
      id: `cap_${Date.now()}`,
      type: "describe",
      textDescription: text,
      createdAt: new Date(),
    };
    setCaptures((prev) => [entry, ...prev]);
    onAddToSession?.(entry);
  }

  function handleAddToSession() {
    if (!previewEntry) return;
    setCaptures((prev) => [previewEntry, ...prev]);
    onAddToSession?.(previewEntry);
    setPreviewEntry(null);
  }

  function handleDiscard() {
    if (previewEntry?.audioUrl) {
      URL.revokeObjectURL(previewEntry.audioUrl);
    }
    setPreviewEntry(null);
  }

  async function handleTranscribe(blob: Blob) {
    if (!onTranscribeToMidi) return;
    await onTranscribeToMidi(blob);
    // Clear the preview once the host has processed the audio
    if (previewEntry?.audioUrl) {
      URL.revokeObjectURL(previewEntry.audioUrl);
    }
    setPreviewEntry(null);
  }

  if (collapsed) {
    return (
      <div
        className={cn(
          "flex h-full w-12 flex-col items-center border-l border-neutral-800 bg-[#0a0a0a] pt-4",
          className,
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-md p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
          aria-label="Expand capture panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-80 flex-col border-l border-neutral-800 bg-[#0a0a0a]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-200">Capture</h2>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            aria-label="Collapse panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "border-b-2 border-amber-500 text-amber-400"
                : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Preview overlay */}
        {previewEntry && (
          <div className="mb-4">
            <CapturePreview
              audioUrl={previewEntry.audioUrl ?? null}
              audioBlob={previewEntry.audioBlob ?? null}
              onAddToSession={handleAddToSession}
              onDiscard={handleDiscard}
              onTranscribeToMidi={
                onTranscribeToMidi && previewEntry.type === "record"
                  ? handleTranscribe
                  : undefined
              }
            />
          </div>
        )}

        {/* Active capture tab */}
        {!previewEntry && activeTab === "record" && (
          <div className="flex flex-col items-center gap-4">
            <RecordButton onRecordingComplete={handleRecordingComplete} />
          </div>
        )}

        {!previewEntry && activeTab === "tap" && (
          <TapPad onTempoConfirmed={handleTapComplete} />
        )}

        {!previewEntry && activeTab === "describe" && (
          <DescribeInput onSubmit={handleDescribeSubmit} />
        )}

        {/* Recent captures */}
        {captures.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Recent Captures
            </h3>
            <div className="space-y-2">
              {captures.slice(0, 10).map((cap) => (
                <div
                  key={cap.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-300">
                      {cap.type === "record" && "Audio Recording"}
                      {cap.type === "tap" && `Tap: ${cap.bpm} BPM`}
                      {cap.type === "describe" && "Text Description"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {cap.createdAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {cap.textDescription && (
                    <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                      {cap.textDescription}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
