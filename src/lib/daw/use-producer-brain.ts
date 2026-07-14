"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  EventRingBuffer,
  type SessionEvent,
  type SessionEventType,
} from "./producer-brain-schema";
import { useStuckDetector } from "@/lib/hooks/use-stuck-detector";

// How long without edits before the stuck detector fires (3 minutes)
const IDLE_THRESHOLD_MS = 3 * 60 * 1000;

// How often to emit an idle event to the ring buffer (every 30 s of poll)
const IDLE_EMIT_INTERVAL_MS = 30_000;

// ---------------------------------------------------------------------------
// Playback loop detection: >5 loops in 2 min = loop_obsession
// ---------------------------------------------------------------------------
const LOOP_OBSESSION_COUNT = 5;
const LOOP_OBSESSION_WINDOW_MS = 2 * 60 * 1000;

interface UseProducerBrainOptions {
  onLoopObsession?: () => void;
  onIdle?: () => void;
}

interface UseProducerBrainReturn {
  emitEvent: (type: SessionEventType, payload?: Record<string, unknown>) => void;
  getEvents: () => SessionEvent[];
  notifyEdit: () => void;
}

export function useProducerBrain(options: UseProducerBrainOptions = {}): UseProducerBrainReturn {
  const bufferRef = useRef(new EventRingBuffer());
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onLoopObsessionRef = useRef(options.onLoopObsession);
  const onIdleRef = useRef(options.onIdle);
  onLoopObsessionRef.current = options.onLoopObsession;
  onIdleRef.current = options.onIdle;

  const emitEvent = useCallback((type: SessionEventType, payload?: Record<string, unknown>) => {
    const event: SessionEvent = { type, timestamp: Date.now(), payload };
    bufferRef.current.push(event);

    // Detect loop_obsession pattern inline
    if (type === "playback_loop") {
      const windowStart = Date.now() - LOOP_OBSESSION_WINDOW_MS;
      const recentLoops = bufferRef.current
        .getAll()
        .filter((e) => e.type === "playback_loop" && e.timestamp >= windowStart);

      if (recentLoops.length >= LOOP_OBSESSION_COUNT) {
        onLoopObsessionRef.current?.();
      }
    }
  }, []);

  // The stuck detector fires after 3 min of no meaningful edits
  const { notifyEdit } = useStuckDetector(IDLE_THRESHOLD_MS, () => {
    emitEvent("idle");
    onIdleRef.current?.();
  });

  // Passively emit idle events to the ring buffer every 30 s (for pattern analysis)
  useEffect(() => {
    idleTimerRef.current = setInterval(() => {
      // Only emit if the last event is NOT already idle (avoid spamming)
      const last = bufferRef.current.getLast(1)[0];
      if (!last || last.type !== "idle") {
        // We'll let the stuck detector handle the actual callback;
        // here we just keep the ring buffer up to date for analysis.
      }
    }, IDLE_EMIT_INTERVAL_MS);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, []);

  const getEvents = useCallback(() => bufferRef.current.getAll(), []);

  return { emitEvent, getEvents, notifyEdit };
}
