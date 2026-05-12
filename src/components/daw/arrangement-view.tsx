"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { TimelineState } from "@/lib/timeline/types";
import { ArrangementCanvas } from "./arrangement-canvas";
import { TrackHeaderList } from "./track-header";

const HEADER_WIDTH = 160;   // px width of the track header column
const RULER_HEIGHT = 28;    // must match ArrangementCanvas constant

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArrangementViewProps {
  timeline: TimelineState;
  selectedTrackId?: string | null;

  // Timeline mutations — caller should dispatch into useTimeline
  onMoveClip?: (clipId: string, startTick: number, trackId?: string) => void;
  onResizeClip?: (clipId: string, durationTicks: number) => void;
  onSetPlayhead?: (tick: number) => void;
  onScrollX?: (scrollTick: number) => void;

  // Track header controls
  onSelectTrack?: (trackId: string) => void;
  onMuteTrack?: (trackId: string) => void;
  onSoloTrack?: (trackId: string) => void;
  onArmTrack?: (trackId: string) => void;
  onRenameTrack?: (trackId: string, name: string) => void;

  /** Grid snap in ticks. Default PPQ (1/4 note). */
  snapTicks?: number;

  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArrangementView({
  timeline,
  selectedTrackId,
  onMoveClip,
  onResizeClip,
  onSetPlayhead,
  onScrollX,
  onSelectTrack,
  onMuteTrack,
  onSoloTrack,
  onArmTrack,
  onRenameTrack,
  snapTicks,
  className,
}: ArrangementViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 400 });

  // Measure the container for responsive sizing
  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDims({
        width: Math.max(200, rect.width),
        height: Math.max(120, rect.height),
      });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Total track height for the canvas content area
  const tracksTotalHeight = timeline.tracks.reduce((s, t) => s + t.laneHeight, 0);
  const canvasHeight = Math.max(tracksTotalHeight, dims.height - RULER_HEIGHT);
  const canvasWidth = dims.width - HEADER_WIDTH;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex overflow-hidden bg-[#0a0a0a] border border-neutral-800 rounded-xl",
        className,
      )}
    >
      {/* Track headers column */}
      <TrackHeaderList
        tracks={timeline.tracks}
        selectedTrackId={selectedTrackId}
        onSelect={onSelectTrack}
        onMute={onMuteTrack}
        onSolo={onSoloTrack}
        onArm={onArmTrack}
        onNameChange={onRenameTrack}
        rulerHeight={RULER_HEIGHT}
        style={{ width: HEADER_WIDTH }}
        className="border-r border-neutral-800"
      />

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden">
        <ArrangementCanvas
          timeline={timeline}
          width={canvasWidth}
          height={canvasHeight}
          onMoveClip={onMoveClip}
          onResizeClip={onResizeClip}
          onSetPlayhead={onSetPlayhead}
          onScrollX={onScrollX}
          snapTicks={snapTicks}
        />
      </div>
    </div>
  );
}
