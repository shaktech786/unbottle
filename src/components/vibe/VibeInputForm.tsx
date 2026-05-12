"use client";

/**
 * VibeInputForm — collects mood, energy, genre, reference, description.
 * MAIN-51
 */

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { VibeInput } from "@/lib/vibe/schema";

const ENERGY_LABELS: Record<number, string> = {
  1: "Very Chill",
  2: "Laid Back",
  3: "Balanced",
  4: "Energetic",
  5: "Intense",
};

const MOOD_SUGGESTIONS = [
  "melancholic", "euphoric", "tense", "dreamy", "hopeful",
  "dark", "uplifting", "nostalgic", "aggressive", "serene",
];

interface VibeInputFormProps {
  onSubmit: (vibe: VibeInput) => void;
  isLoading?: boolean;
  className?: string;
}

export function VibeInputForm({ onSubmit, isLoading, className }: VibeInputFormProps) {
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [genre, setGenre] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!mood.trim()) {
      setError("Please enter a mood");
      return;
    }

    onSubmit({
      mood: mood.trim(),
      energy,
      genre: genre.trim() || undefined,
      reference: reference.trim() || undefined,
      description: description.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4 p-4 bg-neutral-900 rounded-xl text-white", className)}
    >
      <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
        Describe Your Vibe
      </h2>

      {/* Mood */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-300">
          Mood <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="e.g. melancholic, euphoric, dark..."
          className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {MOOD_SUGGESTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] transition-colors",
                mood === m
                  ? "bg-violet-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-300">
          Energy Level: <span className="text-violet-400">{ENERGY_LABELS[energy]}</span>
        </label>
        <div className="flex gap-1.5">
          {([1, 2, 3, 4, 5] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setEnergy(lvl)}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-colors",
                energy === lvl
                  ? "bg-violet-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700",
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Genre (optional) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-300">
          Genre <span className="text-neutral-600">(optional)</span>
        </label>
        <input
          type="text"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="e.g. lo-fi, house, trap..."
          className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Reference (optional) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-300">
          Reference Track <span className="text-neutral-600">(optional)</span>
        </label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. Bon Iver - Holocene, Bicep - Glue..."
          className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Description (optional) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-300">
          Extra Context <span className="text-neutral-600">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the feeling, a scene, a memory..."
          rows={3}
          className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "rounded-lg py-2.5 text-sm font-semibold transition-colors",
          isLoading
            ? "bg-neutral-700 text-neutral-500 cursor-not-allowed"
            : "bg-violet-600 hover:bg-violet-500 text-white",
        )}
      >
        {isLoading ? "Generating..." : "Generate from Vibe"}
      </button>
    </form>
  );
}
