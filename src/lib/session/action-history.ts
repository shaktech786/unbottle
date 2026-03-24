import type { Section, Note } from "@/lib/music/types";

export interface SessionSnapshot {
  sections: Section[];
  notes: Note[];
  bpm: number;
  keySignature: string;
  genre?: string;
  mood?: string;
}

/**
 * A simple undo stack for AI-driven session actions.
 * Stores snapshots of session state so users can revert AI changes.
 */
export class ActionHistory {
  private stack: SessionSnapshot[] = [];
  private maxSize: number;

  constructor(maxSize = 20) {
    this.maxSize = maxSize;
  }

  /** Push a snapshot onto the undo stack. */
  push(snapshot: SessionSnapshot): void {
    this.stack.push(snapshot);
    // Evict oldest if over limit
    while (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
  }

  /** Pop and return the most recent snapshot, or null if empty. */
  undo(): SessionSnapshot | null {
    if (this.stack.length === 0) return null;
    return this.stack.pop()!;
  }

  /** Whether there are snapshots available to undo. */
  canUndo(): boolean {
    return this.stack.length > 0;
  }

  /** Clear all history. */
  clear(): void {
    this.stack = [];
  }
}
