"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { useSession } from "@/lib/hooks/use-session";
import type { NoteName } from "@/lib/music/types";

const GENRE_PRESETS = [
  "Hip-Hop",
  "Pop",
  "R&B",
  "Electronic",
  "Rock",
  "Jazz",
  "Lo-fi",
  "Ambient",
  "Funk",
  "Soul",
  "Classical",
  "Trap",
];

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

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [customGenre, setCustomGenre] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [bpm, setBpm] = useState(120);
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
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-100">New Session</h1>
        <p className="mt-1 text-sm text-slate-400">
          Set the vibe, or just jump in.
        </p>

        {/* Just Start */}
        <button
          onClick={handleJustStart}
          disabled={isLoading}
          className="mt-8 flex w-full items-center gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-600/5 p-6 text-left transition-colors hover:border-indigo-500/50 hover:bg-indigo-600/10 disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
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
            <p className="text-base font-semibold text-indigo-300">
              Just Start
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              120 BPM, key of C, 4/4 time. Change anything later.
            </p>
          </div>
        </button>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs text-slate-500">or customize</span>
          <div className="h-px flex-1 bg-slate-800" />
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
            <label className="text-sm font-medium text-slate-300">
              Genre
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRE_PRESETS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(genre === g ? null : g)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    genre === g
                      ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300",
                  )}
                >
                  {g}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGenre(genre === "__custom__" ? null : "__custom__")}
                className={cn(
                  "rounded-full border border-dashed px-3 py-1 text-xs font-medium transition-colors",
                  genre === "__custom__"
                    ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                    : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300",
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
            <label className="text-sm font-medium text-slate-300">
              Mood / Vibe
            </label>
            <div className="flex flex-wrap gap-2">
              {MOOD_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(mood === m ? null : m)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    mood === m
                      ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* BPM Slider */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">
              Starting BPM
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={40}
                max={240}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-500"
              />
              <span className="w-12 text-right font-mono text-sm font-semibold text-slate-100 tabular-nums">
                {bpm}
              </span>
            </div>
          </div>

          {/* Key */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">
              Starting Key
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setKeySignature(key)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    keySignature === key
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" size="lg" loading={isLoading} className="mt-2">
            Create Session
          </Button>
        </form>
      </div>
    </div>
  );
}
