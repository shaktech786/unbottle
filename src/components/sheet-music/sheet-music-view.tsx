"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { Note, Track } from "@/lib/music/types";
import { exportToMusicXML } from "@/lib/musicxml/writer";

export interface SheetMusicViewProps {
  tracks: Track[];
  notes: Note[];
  bpm: number;
  keySignature?: string;
  timeSignature?: string;
  className?: string;
}

type OSMDInstance = {
  load: (xml: string) => Promise<void>;
  render: () => void;
  zoom: number;
  setOptions: (opts: Record<string, unknown>) => void;
  clear: () => void;
};

export function SheetMusicView({
  tracks,
  notes,
  bpm,
  keySignature = "C major",
  timeSignature = "4/4",
  className,
}: SheetMusicViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OSMDInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazily import OSMD (it's a large library, only load when needed)
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    async function initOSMD() {
      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");

        if (cancelled || !containerRef.current) return;

        const osmd = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          backend: "svg",
          drawTitle: false,
          drawSubtitle: false,
          drawComposer: false,
          drawCredits: false,
          drawPartNames: true,
          drawPartAbbreviations: false,
          drawMeasureNumbers: true,
          drawTimeSignatures: true,
        });

        osmd.zoom = zoom;
        osmdRef.current = osmd as unknown as OSMDInstance;
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sheet music renderer");
          setLoading(false);
        }
      }
    }

    void initOSMD();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Render MusicXML whenever notes/tracks change
  const renderScore = useCallback(async () => {
    const osmd = osmdRef.current;
    if (!osmd || tracks.length === 0) return;

    try {
      const musicxml = exportToMusicXML(tracks, notes, bpm, {
        keySignature,
        timeSignature,
      });

      await osmd.load(musicxml);
      osmd.zoom = zoom;
      osmd.render();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render score");
    }
  }, [tracks, notes, bpm, keySignature, timeSignature, zoom]);

  // Debounce renders to avoid thrashing during rapid note edits
  useEffect(() => {
    if (loading || !osmdRef.current) return;

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      void renderScore();
    }, 300);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [loading, renderScore]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.0, z + 0.1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.3, z - 0.1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1.0);
  }, []);

  if (error) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl border border-red-900/50 bg-red-950/20 p-4", className)}>
        <p className="text-xs text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-neutral-800 bg-[#0a0a0a] overflow-hidden",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <span className="text-xs font-medium text-neutral-400">Sheet Music</span>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="h-6 w-6 rounded text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 flex items-center justify-center"
            title="Zoom out"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={handleZoomReset}
            className="h-6 rounded px-1.5 text-[10px] font-mono text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="h-6 w-6 rounded text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 flex items-center justify-center"
            title="Zoom in"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Score container */}
      <div className="flex-1 overflow-auto bg-white min-h-[200px] relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
              <span className="text-xs text-neutral-500">Loading notation...</span>
            </div>
          </div>
        )}
        {!loading && notes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-neutral-400">Add notes to see sheet music</p>
          </div>
        )}
        <div ref={containerRef} className="p-2" />
      </div>
    </div>
  );
}
