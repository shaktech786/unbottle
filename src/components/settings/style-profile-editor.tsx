"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { StyleProfile } from "@/lib/style/schema";

const GENRE_OPTIONS = [
  "Hip-Hop", "Pop", "R&B", "Electronic", "Rock", "Jazz",
  "Lo-fi", "Ambient", "Funk", "Soul", "Classical", "Trap",
  "House", "Techno", "Reggae", "Folk", "Country", "Metal",
];

const VIBE_OPTIONS = [
  "Chill", "Energetic", "Melancholic", "Uplifting", "Dark",
  "Dreamy", "Aggressive", "Playful", "Nostalgic", "Ethereal",
  "Groovy", "Tense", "Romantic", "Cinematic", "Raw",
];

const KEY_OPTIONS = [
  "C major", "G major", "D major", "A major", "E major", "B major",
  "F major", "Bb major", "Eb major", "Ab major", "Db major", "Gb major",
  "A minor", "E minor", "B minor", "F# minor", "C# minor", "G# minor",
  "D minor", "G minor", "C minor", "F minor", "Bb minor", "Eb minor",
];

interface StyleProfileEditorProps {
  className?: string;
}

/**
 * MAIN-34 — Settings section for viewing and editing the user's style profile.
 * Loads the profile from /api/style/profile (GET) and saves via PUT.
 */
export function StyleProfileEditor({ className }: StyleProfileEditorProps) {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [keySignatures, setKeySignatures] = useState<string[]>([]);
  const [tempoMin, setTempoMin] = useState(80);
  const [tempoMax, setTempoMax] = useState(140);
  const [genres, setGenres] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/style/profile");
      if (res.status === 404) {
        // No profile yet — use defaults
        setProfile(null);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to load style profile");
      }
      const data = (await res.json()) as { profile: StyleProfile };
      setProfile(data.profile);
      setKeySignatures(data.profile.keySignatures);
      setTempoMin(data.profile.tempoRange[0]);
      setTempoMax(data.profile.tempoRange[1]);
      setGenres(data.profile.genres);
      setVibes(data.profile.vibes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const safeMin = Math.min(tempoMin, tempoMax);
      const safeMax = Math.max(tempoMin, tempoMax);

      const res = await fetch("/api/style/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keySignatures,
          tempoRange: [safeMin, safeMax],
          genres,
          vibes,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }

      const data = (await res.json()) as { profile: StyleProfile };
      setProfile(data.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleItem<T>(list: T[], item: T, setList: (v: T[]) => void) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  return (
    <Card className={cn("p-4 sm:p-6", className)}>
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-lg font-semibold text-neutral-100">Musical Style DNA</h2>
        {saved && (
          <span className="text-xs font-medium text-emerald-400 transition-opacity">Saved!</span>
        )}
      </div>
      <p className="mb-5 text-sm text-neutral-400">
        Unbottle uses this to personalize AI suggestions to your sound. Auto-populated as you upload reference tracks.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" className="text-amber-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tempo range */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Tempo range: {tempoMin}–{tempoMax} BPM
            </label>
            <div className="flex gap-3 items-center">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500">Min</span>
                <input
                  type="range"
                  min={40}
                  max={240}
                  value={tempoMin}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTempoMin(Math.min(v, tempoMax));
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-amber-500"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500">Max</span>
                <input
                  type="range"
                  min={40}
                  max={240}
                  value={tempoMax}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTempoMax(Math.max(v, tempoMin));
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Key signatures */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Keys ({keySignatures.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {KEY_OPTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleItem(keySignatures, key, setKeySignatures)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    keySignatures.includes(key)
                      ? "bg-amber-500 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Genres ({genres.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleItem(genres, genre, setGenres)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    genres.includes(genre)
                      ? "bg-violet-500 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200",
                  )}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Vibes */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Vibes ({vibes.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VIBE_OPTIONS.map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => toggleItem(vibes, vibe, setVibes)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    vibes.includes(vibe)
                      ? "bg-pink-500 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200",
                  )}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {profile === null && (
            <p className="text-xs text-neutral-500">
              No style profile yet. Make selections above and save, or upload a reference track to auto-populate.
            </p>
          )}

          <Button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? <Spinner size="sm" className="mr-2" /> : null}
            {isSaving ? "Saving..." : "Save Style Profile"}
          </Button>
        </div>
      )}
    </Card>
  );
}
