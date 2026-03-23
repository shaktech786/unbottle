"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { useSession } from "@/lib/hooks/use-session";
import { usePreferences } from "@/lib/hooks/use-preferences";
import type { NoteName } from "@/lib/music/types";

const GENRE_PRESETS: { name: string; color: string }[] = [
  { name: "Hip-Hop", color: "amber" },
  { name: "Pop", color: "pink" },
  { name: "R&B", color: "purple" },
  { name: "Electronic", color: "cyan" },
  { name: "Rock", color: "red" },
  { name: "Jazz", color: "orange" },
  { name: "Lo-fi", color: "violet" },
  { name: "Ambient", color: "teal" },
  { name: "Funk", color: "yellow" },
  { name: "Soul", color: "fuchsia" },
  { name: "Classical", color: "indigo" },
  { name: "Trap", color: "rose" },
];

const genreSelectedStyles: Record<string, string> = {
  amber: "border-amber-500 bg-amber-500/20 text-amber-300",
  pink: "border-pink-500 bg-pink-500/20 text-pink-300",
  purple: "border-purple-500 bg-purple-500/20 text-purple-300",
  cyan: "border-cyan-500 bg-cyan-500/20 text-cyan-300",
  red: "border-red-500 bg-red-500/20 text-red-300",
  orange: "border-orange-500 bg-orange-500/20 text-orange-300",
  violet: "border-violet-500 bg-violet-500/20 text-violet-300",
  teal: "border-teal-500 bg-teal-500/20 text-teal-300",
  yellow: "border-yellow-500 bg-yellow-500/20 text-yellow-300",
  fuchsia: "border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-300",
  indigo: "border-indigo-500 bg-indigo-500/20 text-indigo-300",
  rose: "border-rose-500 bg-rose-500/20 text-rose-300",
};

const MOOD_PRESETS = [
  "Chill",
  "Energetic",
  "Melancholic",
  "Uplifting",
  "Dark",
  "Dreamy",
  "Aggressive",
  "Playful",
  "Nostalgic",
  "Ethereal",
];

const ALL_KEYS: NoteName[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

export default function NewSessionPage() {
  const { createSession, isLoading } = useSession();
  const { preferences } = usePreferences();

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<string | null>(() => preferences.defaultGenre || null);
  const [customGenre, setCustomGenre] = useState("");
  const [mood, setMood] = useState<string | null>(() => preferences.defaultMood || null);
  const [bpm, setBpm] = useState(() => preferences.defaultBpm);
  const [keySignature, setKeySignature] = useState<string>("C");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createSession({
      title: title.trim() || undefined,
      genre: genre === "__custom__" ? customGenre.trim() : (genre ?? undefined),
      mood: mood ?? undefined,
      bpm,
      keySignature,
    });
  }

  async function handleJustStart() {
    await createSession();
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-bold text-neutral-100">New Session</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Set the vibe, or just jump in.
        </p>

        {/* Just Start - hero action */}
        <button
          onClick={handleJustStart}
          disabled={isLoading}
          className="group mt-8 flex w-full items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-left transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-lg hover:shadow-amber-500/10 disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow-lg shadow-amber-500/20 transition-shadow duration-300 group-hover:shadow-amber-500/40">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-300">
              Just Start
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              120 BPM, key of C, 4/4 time. Change anything later.
            </p>
          </div>
        </button>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="text-xs text-neutral-500">or customize</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Title */}
          <Input
            label="Session Title (optional)"
            placeholder="My new track..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Genre */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-300">
              Genre
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRE_PRESETS.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => setGenre(genre === g.name ? null : g.name)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-300 min-h-[36px]",
                    genre === g.name
                      ? genreSelectedStyles[g.color]
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300",
                  )}
                >
                  {g.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGenre(genre === "__custom__" ? null : "__custom__")}
                className={cn(
                  "rounded-full border border-dashed px-3.5 py-1.5 text-xs font-medium transition-colors duration-300 min-h-[36px]",
                  genre === "__custom__"
                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300",
                )}
              >
                + Custom
              </button>
            </div>
            {genre === "__custom__" && (
              <Input
                placeholder="Type your genre..."
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                className="mt-1"
              />
            )}
          </div>

          {/* Mood */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-300">
              Mood / Vibe
            </label>
            <div className="flex flex-wrap gap-2">
              {MOOD_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(mood === m ? null : m)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-300 min-h-[36px]",
                    mood === m
                      ? "border-amber-500 bg-amber-500/20 text-amber-300"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* BPM Slider */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-300">
              Starting BPM
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={40}
                max={240}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-amber-500 touch-pan-x"
              />
              <span className="w-12 text-right font-mono text-sm font-bold text-amber-400 tabular-nums">
                {bpm}
              </span>
            </div>
          </div>

          {/* Key */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-300">
              Starting Key
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setKeySignature(key)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg font-mono text-xs font-medium transition-colors duration-300 sm:h-9 sm:w-9",
                    keySignature === key
                      ? "bg-amber-500 text-white"
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" size="lg" loading={isLoading} className="mt-2 w-full min-h-[44px]">
            Create Session
          </Button>
        </form>
      </div>
    </div>
  );
}
