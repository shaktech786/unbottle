"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui/spinner";

export interface IdeaTextInputResult {
  chordProgression?: string;
  mood?: string;
  tempoSuggestion?: string;
  rawText: string;
}

export interface IdeaTextInputProps {
  /** Called when the AI returns a result. Result is stored by the parent. */
  onResult?: (result: IdeaTextInputResult) => void;
  /** Called with the raw prompt text when the user submits (regardless of AI result). */
  onSubmit?: (prompt: string) => void;
  className?: string;
}

/**
 * Text input for describing the vibe or feeling of an idea.
 * Sends the prompt to /api/arrangement/suggest and returns the AI's mood/
 * chord/tempo suggestions.
 */
export function IdeaTextInput({ onResult, onSubmit, className }: IdeaTextInputProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<IdeaTextInputResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    const prompt = text.trim();
    if (!prompt || isLoading) return;

    setError(null);
    setLastResult(null);
    setIsLoading(true);
    onSubmit?.(prompt);

    try {
      const res = await fetch("/api/arrangement/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        chordProgression?: string;
        mood?: string;
        tempoSuggestion?: string;
      };

      const result: IdeaTextInputResult = {
        chordProgression: data.chordProgression,
        mood: data.mood,
        tempoSuggestion: data.tempoSuggestion,
        rawText: prompt,
      };

      setLastResult(result);
      onResult?.(result);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-400">
          Describe the vibe or feeling
        </label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. something dark and heavy with a lot of tension, like a storm coming..."
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg border border-neutral-700 bg-neutral-900",
            "px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600",
            "focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30",
            "transition-colors",
          )}
        />
        <p className="text-[10px] text-neutral-600">⌘↵ to submit</p>
      </div>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!text.trim() || isLoading}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          "bg-amber-500 text-white hover:bg-amber-400",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {isLoading ? <Spinner className="h-4 w-4" /> : null}
        {isLoading ? "Thinking..." : "Generate from vibe"}
      </button>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {lastResult && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 space-y-1.5">
          {lastResult.mood && (
            <p className="text-xs text-neutral-300">
              <span className="text-neutral-500">Mood: </span>
              {lastResult.mood}
            </p>
          )}
          {lastResult.chordProgression && (
            <p className="text-xs text-neutral-300">
              <span className="text-neutral-500">Chords: </span>
              {lastResult.chordProgression}
            </p>
          )}
          {lastResult.tempoSuggestion && (
            <p className="text-xs text-neutral-300">
              <span className="text-neutral-500">Tempo: </span>
              {lastResult.tempoSuggestion}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
