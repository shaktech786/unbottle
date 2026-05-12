"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/**
 * IdeaContext stores all captured idea inputs for a session:
 * - audioBuffer: decoded AudioBuffer from mic recording
 * - pitchHistory: array of detected pitches (note names) during capture
 * - textPrompt: user-submitted text description of the vibe/feeling
 * - referenceBuffer: decoded AudioBuffer from dropped/pasted reference track
 */
export interface IdeaState {
  audioBuffer: AudioBuffer | null;
  pitchHistory: string[];
  textPrompt: string | null;
  referenceBuffer: AudioBuffer | null;
}

export interface IdeaContextValue extends IdeaState {
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  addPitch: (note: string) => void;
  clearPitchHistory: () => void;
  setTextPrompt: (prompt: string | null) => void;
  setReferenceBuffer: (buffer: AudioBuffer | null) => void;
  clearIdea: () => void;
  /** Build a summary string suitable for injecting into AI prompts. */
  buildIdeaSummary: () => string | null;
}

const IdeaContext = createContext<IdeaContextValue | null>(null);

export function IdeaProvider({ children }: { children: ReactNode }) {
  const [audioBuffer, setAudioBufferState] = useState<AudioBuffer | null>(null);
  const [pitchHistory, setPitchHistory] = useState<string[]>([]);
  const [textPrompt, setTextPromptState] = useState<string | null>(null);
  const [referenceBuffer, setReferenceBufferState] = useState<AudioBuffer | null>(null);

  const setAudioBuffer = useCallback((buffer: AudioBuffer | null) => {
    setAudioBufferState(buffer);
  }, []);

  const addPitch = useCallback((note: string) => {
    setPitchHistory((prev) => {
      // Only append when pitch changes (avoid identical consecutive entries)
      if (prev[prev.length - 1] === note) return prev;
      return [...prev, note];
    });
  }, []);

  const clearPitchHistory = useCallback(() => setPitchHistory([]), []);

  const setTextPrompt = useCallback((prompt: string | null) => {
    setTextPromptState(prompt);
  }, []);

  const setReferenceBuffer = useCallback((buffer: AudioBuffer | null) => {
    setReferenceBufferState(buffer);
  }, []);

  const clearIdea = useCallback(() => {
    setAudioBufferState(null);
    setPitchHistory([]);
    setTextPromptState(null);
    setReferenceBufferState(null);
  }, []);

  const buildIdeaSummary = useCallback((): string | null => {
    const parts: string[] = [];

    if (textPrompt?.trim()) {
      parts.push(`User's vibe description: "${textPrompt.trim()}"`);
    }

    if (pitchHistory.length > 0) {
      // Deduplicate consecutive repeated notes for readability
      const deduped: string[] = [];
      for (const n of pitchHistory) {
        if (deduped[deduped.length - 1] !== n) deduped.push(n);
      }
      parts.push(`Hummed melody (detected notes): ${deduped.slice(0, 20).join(", ")}`);
    }

    if (audioBuffer) {
      const durationSec = audioBuffer.duration.toFixed(1);
      parts.push(`Audio capture: ${durationSec}s recorded`);
    }

    if (referenceBuffer) {
      const refDuration = referenceBuffer.duration.toFixed(1);
      parts.push(`Reference track: ${refDuration}s loaded`);
    }

    if (parts.length === 0) return null;
    return `## Captured Idea\n${parts.map((p) => `- ${p}`).join("\n")}`;
  }, [audioBuffer, pitchHistory, textPrompt, referenceBuffer]);

  return (
    <IdeaContext.Provider
      value={{
        audioBuffer,
        pitchHistory,
        textPrompt,
        referenceBuffer,
        setAudioBuffer,
        addPitch,
        clearPitchHistory,
        setTextPrompt,
        setReferenceBuffer,
        clearIdea,
        buildIdeaSummary,
      }}
    >
      {children}
    </IdeaContext.Provider>
  );
}

export function useIdeaContext(): IdeaContextValue {
  const ctx = useContext(IdeaContext);
  if (!ctx) {
    throw new Error("useIdeaContext must be used within an IdeaProvider");
  }
  return ctx;
}
