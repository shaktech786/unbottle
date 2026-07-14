import type { Section, Note, Track } from "@/lib/music/types";

export interface DAWSnapshot {
  tracks: Track[];
  sections: Section[];
  notes: Note[];
  bpm: number;
  keySignature: string;
}

const MAX_HISTORY = 50;

export class UndoStack {
  private past: DAWSnapshot[] = [];
  private future: DAWSnapshot[] = [];

  push(snapshot: DAWSnapshot): void {
    this.past.push(structuredClone(snapshot));
    if (this.past.length > MAX_HISTORY) {
      this.past.shift();
    }
    // Any new action wipes the redo branch
    this.future = [];
  }

  undo(current: DAWSnapshot): DAWSnapshot | null {
    if (this.past.length === 0) return null;
    this.future.push(structuredClone(current));
    return this.past.pop()!;
  }

  redo(current: DAWSnapshot): DAWSnapshot | null {
    if (this.future.length === 0) return null;
    this.past.push(structuredClone(current));
    return this.future.pop()!;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  get pastLength(): number {
    return this.past.length;
  }

  get futureLength(): number {
    return this.future.length;
  }
}
