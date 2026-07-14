"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ExportProgress } from "./export-progress";
import { useSessionContext } from "@/lib/session/context";
import { useToast } from "@/components/ui/toast-provider";
import type { ExportFormat, BitDepth } from "@/lib/export/schema";
import { renderSessionToAudio } from "@/lib/audio/offline-renderer";
import { exportToMidi } from "@/lib/midi/writer";
import { ticksToSeconds } from "@/lib/music/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PanelStatus = "idle" | "exporting" | "done" | "error";

interface ExportResult {
  url: string;
  filename: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<ExportFormat, string> = {
  wav: "WAV Audio",
  mp3: "MP3 (via AI)",
  midi: "MIDI File",
  stems: "Stems (per-track WAV)",
  bundle: "Project Bundle (ZIP)",
};

const FORMAT_DESCRIPTIONS: Record<ExportFormat, string> = {
  wav: "Full mix rendered to WAV",
  mp3: "AI-generated MP3 via ElevenLabs",
  midi: "Standard MIDI file compatible with any DAW",
  stems: "Each track exported as a separate WAV file",
  bundle: "Project JSON + audio + MIDI as a ZIP",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ExportSettingsPanelProps {
  sessionId: string;
  onClose?: () => void;
  className?: string;
}

export function ExportSettingsPanel({
  sessionId,
  className,
}: ExportSettingsPanelProps) {
  const { session, notes, tracks } = useSessionContext();
  const { addToast } = useToast();

  const [format, setFormat] = useState<ExportFormat>("midi");
  const [bitDepth, setBitDepth] = useState<BitDepth>(24);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(
    new Set(tracks.map((t) => t.id)),
  );
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keep selectedTrackIds in sync when tracks load
  const toggleTrack = useCallback((id: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllTracks = useCallback(() => {
    setSelectedTrackIds(new Set(tracks.map((t) => t.id)));
  }, [tracks]);

  const clearAllTracks = useCallback(() => {
    setSelectedTrackIds(new Set());
  }, []);

  // ----- Export handlers -----

  async function handleExport() {
    if (!session) return;

    setStatus("exporting");
    setProgress(0);
    setErrorMsg(null);

    try {
      const bpm = session.bpm || 120;
      const activeTracks = tracks.filter(
        (t) => selectedTrackIds.has(t.id),
      );
      const activeNotes = notes.filter((n) =>
        selectedTrackIds.has(n.trackId),
      );

      if (format === "midi") {
        const bytes = exportToMidi(activeTracks, activeNotes, bpm);
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/midi" });
        const url = URL.createObjectURL(blob);
        setResult({ url, filename: `unbottle-${sessionId}.mid` });
        setStatus("done");
        addToast({ message: "MIDI export ready", variant: "success", duration: 3000 });
        return;
      }

      if (format === "wav") {
        let maxEndTick = 0;
        for (const n of activeNotes) {
          const end = n.startTick + n.durationTicks;
          if (end > maxEndTick) maxEndTick = end;
        }
        const duration = ticksToSeconds(maxEndTick, bpm) + 0.5;

        const blob = await renderSessionToAudio(
          activeNotes,
          activeTracks,
          bpm,
          Math.max(0.1, duration),
          (p) => setProgress(p),
        );
        const url = URL.createObjectURL(blob);
        setResult({ url, filename: `unbottle-${sessionId}.wav` });
        setStatus("done");
        addToast({ message: "WAV export ready", variant: "success", duration: 3000 });
        return;
      }

      if (format === "stems") {
        // Stems: render each track in isolation, then zip
        const { default: JSZip } = await import("jszip").catch(() => {
          throw new Error("JSZip not available — run: npm install jszip");
        });
        const zip = new JSZip();

        let maxEndTick = 0;
        for (const n of activeNotes) {
          const end = n.startTick + n.durationTicks;
          if (end > maxEndTick) maxEndTick = end;
        }
        const duration = ticksToSeconds(maxEndTick, bpm) + 0.5;

        for (let i = 0; i < activeTracks.length; i++) {
          const track = activeTracks[i];
          const trackNotes = activeNotes.filter((n) => n.trackId === track.id);
          const stemBlob = await renderSessionToAudio(
            trackNotes,
            [track],
            bpm,
            Math.max(0.1, duration),
          );
          const buf = await stemBlob.arrayBuffer();
          zip.file(`${track.name.replace(/[^a-z0-9_-]/gi, "_")}.wav`, buf);
          setProgress(Math.round(((i + 1) / activeTracks.length) * 100));
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        setResult({ url, filename: `unbottle-stems-${sessionId}.zip` });
        setStatus("done");
        addToast({ message: "Stems export ready", variant: "success", duration: 3000 });
        return;
      }

      if (format === "bundle") {
        const { default: JSZip } = await import("jszip").catch(() => {
          throw new Error("JSZip not available — run: npm install jszip");
        });
        const zip = new JSZip();

        // Project JSON
        const { serializeProject } = await import("@/lib/project/schema");
        const projectData = serializeProject(session, activeTracks, [], activeNotes);
        zip.file("project.json", JSON.stringify(projectData, null, 2));

        // MIDI
        const midiBytes = exportToMidi(activeTracks, activeNotes, bpm);
        zip.file(`${session.title || "project"}.mid`, midiBytes);

        setProgress(60);

        // WAV mix
        let maxEndTick = 0;
        for (const n of activeNotes) {
          const end = n.startTick + n.durationTicks;
          if (end > maxEndTick) maxEndTick = end;
        }
        const duration = ticksToSeconds(maxEndTick, bpm) + 0.5;
        const wavBlob = await renderSessionToAudio(
          activeNotes,
          activeTracks,
          bpm,
          Math.max(0.1, duration),
        );
        zip.file(`${session.title || "project"}.wav`, await wavBlob.arrayBuffer());
        setProgress(90);

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        setResult({ url, filename: `unbottle-bundle-${sessionId}.zip` });
        setStatus("done");
        addToast({ message: "Bundle export ready", variant: "success", duration: 3000 });
        return;
      }

      // mp3 — not directly renderable client-side; delegate to AI audio flow
      throw new Error(
        "MP3 generation requires ElevenLabs API. Use the AI Audio export instead.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      setErrorMsg(msg);
      setStatus("error");
      addToast({ message: msg, variant: "error" });
    }
  }

  function handleReset() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setStatus("idle");
    setProgress(0);
    setErrorMsg(null);
  }

  const showStemsConfig = format === "stems";
  const showBitDepth = format === "wav" || format === "stems";
  const hasNotes = notes.length > 0;

  return (
    <div className={`flex flex-col gap-5 ${className ?? ""}`}>
      {/* Format selector */}
      <div>
        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2 block">
          Format
        </label>
        <div className="grid grid-cols-1 gap-2">
          {(["midi", "wav", "stems", "bundle", "mp3"] as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={[
                "text-left rounded-lg border px-4 py-3 transition-colors",
                format === f
                  ? "border-amber-500 bg-amber-500/10 text-neutral-100"
                  : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500",
              ].join(" ")}
            >
              <span className="block text-sm font-medium">{FORMAT_LABELS[f]}</span>
              <span className="block text-xs text-neutral-500 mt-0.5">
                {FORMAT_DESCRIPTIONS[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bit depth */}
      {showBitDepth && (
        <div>
          <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2 block">
            Bit Depth
          </label>
          <div className="flex gap-2">
            {([16, 24, 32] as BitDepth[]).map((d) => (
              <button
                key={d}
                onClick={() => setBitDepth(d)}
                className={[
                  "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                  bitDepth === d
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500",
                ].join(" ")}
              >
                {d}-bit
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stems track selection */}
      {showStemsConfig && tracks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
              Tracks to export
            </label>
            <div className="flex gap-2 text-xs">
              <button
                onClick={selectAllTracks}
                className="text-amber-400 hover:text-amber-300"
              >
                All
              </button>
              <span className="text-neutral-600">/</span>
              <button
                onClick={clearAllTracks}
                className="text-neutral-400 hover:text-neutral-300"
              >
                None
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {tracks.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 px-3 py-2 cursor-pointer hover:border-neutral-600 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTrackIds.has(t.id)}
                  onChange={() => toggleTrack(t.id)}
                  className="accent-amber-500"
                />
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: t.color }}
                />
                <span className="text-sm text-neutral-200 truncate">{t.name}</span>
                <span className="text-xs text-neutral-500 ml-auto">{t.instrument}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Export button / progress / result */}
      {status === "idle" && (
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={!hasNotes || (showStemsConfig && selectedTrackIds.size === 0)}
          className="w-full"
        >
          {!hasNotes ? "No notes to export" : `Export ${FORMAT_LABELS[format]}`}
        </Button>
      )}

      {status === "exporting" && (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-500 border-t-amber-500" />
          <span className="text-xs text-neutral-400">
            Exporting{progress > 0 ? ` ${progress}%` : "..."}
          </span>
          {progress > 0 && (
            <div className="w-full h-1 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {status === "done" && result && (
        <div className="flex flex-col gap-2">
          <ExportProgress
            complete
            downloadUrl={result.url}
            filename={result.filename}
          />
          <Button variant="ghost" size="sm" onClick={handleReset} className="w-full">
            Export another format
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-red-400">{errorMsg}</p>
          <Button variant="secondary" size="sm" onClick={handleReset} className="w-full">
            Try again
          </Button>
        </div>
      )}

      {/* bitDepth info note */}
      {showBitDepth && status === "idle" && (
        <p className="text-xs text-neutral-600">
          Higher bit depth preserves more dynamic range. 24-bit is recommended for most use cases.
        </p>
      )}
    </div>
  );
}
