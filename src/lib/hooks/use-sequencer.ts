"use client";

import { useCallback, useState } from "react";
import type { Note, Pitch } from "@/lib/music/types";

export interface UseSequencerReturn {
  notes: Note[];
  addNote: (note: Omit<Note, "id">) => Note;
  removeNote: (noteId: string) => void;
  moveNote: (noteId: string, newStartTick: number, newPitch: Pitch) => void;
  resizeNote: (noteId: string, newDurationTicks: number) => void;
  updateNoteVelocity: (noteId: string, velocity: number) => void;
  selectedNotes: Set<string>;
  selectNote: (noteId: string, additive?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setNotes: (notes: Note[]) => void;
  clearAll: () => void;
}

function generateId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const MAX_HISTORY = 50;

interface HistoryState {
  stack: Note[][];
  index: number;
}

/**
 * React hook for managing sequencer note data.
 *
 * Provides CRUD operations on notes, selection management,
 * and a simple undo/redo history stack.
 */
export function useSequencer(initialNotes: Note[] = []): UseSequencerReturn {
  const [notes, setNotesState] = useState<Note[]>(initialNotes);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<HistoryState>({
    stack: [initialNotes],
    index: 0,
  });

  const pushHistory = useCallback((newNotes: Note[]) => {
    setHistory((prev) => {
      const newStack = prev.stack.slice(0, prev.index + 1);
      newStack.push(newNotes);

      // Cap history size
      if (newStack.length > MAX_HISTORY) {
        newStack.shift();
        return { stack: newStack, index: newStack.length - 1 };
      }

      return { stack: newStack, index: newStack.length - 1 };
    });
  }, []);

  const applyNotes = useCallback(
    (newNotes: Note[]) => {
      setNotesState(newNotes);
      pushHistory(newNotes);
    },
    [pushHistory],
  );

  const addNote = useCallback(
    (noteData: Omit<Note, "id">): Note => {
      const note: Note = { ...noteData, id: generateId() };
      const next = [...notes, note];
      applyNotes(next);
      return note;
    },
    [notes, applyNotes],
  );

  const removeNote = useCallback(
    (noteId: string) => {
      const next = notes.filter((n) => n.id !== noteId);
      applyNotes(next);
      setSelectedNotes((prev) => {
        const copy = new Set(prev);
        copy.delete(noteId);
        return copy;
      });
    },
    [notes, applyNotes],
  );

  const moveNote = useCallback(
    (noteId: string, newStartTick: number, newPitch: Pitch) => {
      const next = notes.map((n) =>
        n.id === noteId
          ? { ...n, startTick: Math.max(0, newStartTick), pitch: newPitch }
          : n,
      );
      applyNotes(next);
    },
    [notes, applyNotes],
  );

  const resizeNote = useCallback(
    (noteId: string, newDurationTicks: number) => {
      const next = notes.map((n) =>
        n.id === noteId
          ? { ...n, durationTicks: Math.max(1, newDurationTicks) }
          : n,
      );
      applyNotes(next);
    },
    [notes, applyNotes],
  );

  const updateNoteVelocity = useCallback(
    (noteId: string, velocity: number) => {
      const next = notes.map((n) =>
        n.id === noteId
          ? { ...n, velocity: Math.max(0, Math.min(127, velocity)) }
          : n,
      );
      applyNotes(next);
    },
    [notes, applyNotes],
  );

  const selectNote = useCallback((noteId: string, additive = false) => {
    setSelectedNotes((prev) => {
      if (additive) {
        const copy = new Set(prev);
        if (copy.has(noteId)) {
          copy.delete(noteId);
        } else {
          copy.add(noteId);
        }
        return copy;
      }
      return new Set([noteId]);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNotes(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedNotes(new Set(notes.map((n) => n.id)));
  }, [notes]);

  const deleteSelected = useCallback(() => {
    if (selectedNotes.size === 0) return;
    const next = notes.filter((n) => !selectedNotes.has(n.id));
    applyNotes(next);
    setSelectedNotes(new Set());
  }, [notes, selectedNotes, applyNotes]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.index <= 0) return prev;
      const newIndex = prev.index - 1;
      setNotesState(prev.stack[newIndex]);
      return { ...prev, index: newIndex };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.index >= prev.stack.length - 1) return prev;
      const newIndex = prev.index + 1;
      setNotesState(prev.stack[newIndex]);
      return { ...prev, index: newIndex };
    });
  }, []);

  const setNotes = useCallback(
    (newNotes: Note[]) => {
      applyNotes(newNotes);
    },
    [applyNotes],
  );

  const clearAll = useCallback(() => {
    applyNotes([]);
  }, [applyNotes]);

  return {
    notes,
    addNote,
    removeNote,
    moveNote,
    resizeNote,
    updateNoteVelocity,
    selectedNotes,
    selectNote,
    clearSelection,
    selectAll,
    deleteSelected,
    undo,
    redo,
    canUndo: history.index > 0,
    canRedo: history.index < history.stack.length - 1,
    setNotes,
    clearAll,
  };
}
