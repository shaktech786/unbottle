/**
 * Producer Brain — event and pattern types.
 *
 * SessionEvents are emitted by the passive listener as the user works.
 * EventPatterns are detected from the event stream by the suggestion engine.
 */

// ---------------------------------------------------------------------------
// Session events
// ---------------------------------------------------------------------------

export type SessionEventType =
  | "clip_added"
  | "clip_moved"
  | "param_changed"
  | "playback_loop"
  | "idle";

export interface SessionEvent {
  type: SessionEventType;
  timestamp: number; // Unix ms
  payload?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Detected patterns
// ---------------------------------------------------------------------------

export type EventPatternType =
  | "loop_obsession"
  | "muddy_mix"
  | "timing_drift"
  | "key_conflict";

export interface EventPattern {
  type: EventPatternType;
  /** 0–1 confidence score */
  confidence: number;
  /** Human-readable one-line suggestion */
  suggestion: string;
  /** Timestamp when the pattern was detected */
  detectedAt: number;
}

// ---------------------------------------------------------------------------
// Ring buffer helpers
// ---------------------------------------------------------------------------

const RING_BUFFER_SIZE = 100;

export class EventRingBuffer {
  private _buffer: SessionEvent[] = [];

  push(event: SessionEvent): void {
    this._buffer.push(event);
    if (this._buffer.length > RING_BUFFER_SIZE) {
      this._buffer.shift();
    }
  }

  /** Returns a copy of all events in chronological order */
  getAll(): SessionEvent[] {
    return [...this._buffer];
  }

  /** Returns the most recent N events */
  getLast(n: number): SessionEvent[] {
    return this._buffer.slice(-n);
  }

  clear(): void {
    this._buffer = [];
  }

  get size(): number {
    return this._buffer.length;
  }
}
