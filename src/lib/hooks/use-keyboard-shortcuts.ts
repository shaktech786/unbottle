"use client";

import { useEffect } from "react";

export interface UseKeyboardShortcutsOptions {
  onPlayPause: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onEscape: () => void;
  enabled?: boolean;
}

function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const {
    onPlayPause,
    onUndo,
    onRedo,
    onDelete,
    onSelectAll,
    onEscape,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (isTyping()) return;

      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + Shift + Z  or  Ctrl/Cmd + Y  -> Redo (check before Undo)
      if (mod && e.shiftKey && e.key === "z") {
        e.preventDefault();
        onRedo();
        return;
      }
      if (mod && e.key === "y") {
        e.preventDefault();
        onRedo();
        return;
      }

      // Ctrl/Cmd + Z -> Undo
      if (mod && e.key === "z") {
        e.preventDefault();
        onUndo();
        return;
      }

      // Ctrl/Cmd + A -> Select All
      if (mod && e.key === "a") {
        e.preventDefault();
        onSelectAll();
        return;
      }

      // Space -> Play/Pause
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        onPlayPause();
        return;
      }

      // Delete / Backspace -> Delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDelete();
        return;
      }

      // Escape -> Clear selection
      if (e.key === "Escape") {
        onEscape();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onPlayPause, onUndo, onRedo, onDelete, onSelectAll, onEscape]);
}
