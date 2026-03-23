"use client";

import { useState, useEffect, useRef } from "react";
import { useApiKey } from "@/lib/hooks/use-api-key";
import { useElevenLabsKey } from "@/lib/hooks/use-elevenlabs-key";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const GENRE_OPTIONS = [
  "",
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

const MOOD_OPTIONS = [
  "",
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

function SavedIndicator({ show }: { show: boolean }) {
  return (
    <span
      className={`ml-2 text-xs font-medium text-emerald-400 transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      Saved!
    </span>
  );
}

export default function SettingsPage() {
  const { apiKey, setApiKey, hasUserKey, isLoaded } = useApiKey();
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // ElevenLabs key state
  const {
    apiKey: elevenLabsKey,
    setApiKey: setElevenLabsKey,
    hasUserKey: hasElevenLabsKey,
  } = useElevenLabsKey();
  const [elInputValue, setElInputValue] = useState("");
  const [showElKey, setShowElKey] = useState(false);
  const [elSaved, setElSaved] = useState(false);

  // Preferences
  const { preferences, updatePreference } = usePreferences();
  const [prefSaved, setPrefSaved] = useState(false);
  const prefSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showPrefSaved() {
    setPrefSaved(true);
    if (prefSavedTimer.current) clearTimeout(prefSavedTimer.current);
    prefSavedTimer.current = setTimeout(() => setPrefSaved(false), 2000);
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (prefSavedTimer.current) clearTimeout(prefSavedTimer.current);
    };
  }, []);

  function handleSave() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    setInputValue("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleRemove() {
    setApiKey(null);
    setInputValue("");
  }

  function handleElSave() {
    const trimmed = elInputValue.trim();
    if (!trimmed) return;
    setElevenLabsKey(trimmed);
    setElInputValue("");
    setElSaved(true);
    setTimeout(() => setElSaved(false), 2000);
  }

  function handleElRemove() {
    setElevenLabsKey(null);
    setElInputValue("");
  }

  if (!isLoaded) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8 overflow-y-auto">
      <h1 className="mb-2 text-2xl font-bold text-neutral-100">Settings</h1>
      <p className="mb-8 text-neutral-400">
        Configure your Unbottle experience.
      </p>

      <Card className="p-4 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-neutral-100">
          Anthropic API Key
        </h2>
        <p className="mb-4 text-sm text-neutral-400">
          Unbottle uses Claude to power the AI producer. You can use your own
          Anthropic API key, or use the default server key if available.
        </p>

        {hasUserKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-emerald-400">
                      Your key is active
                    </span>
                    <p className="mt-0.5 font-mono text-xs text-neutral-500">
                      {showKey
                        ? apiKey
                        : `${apiKey?.slice(0, 12)}...${apiKey?.slice(-4)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-xs text-neutral-500 transition-colors duration-300 hover:text-neutral-300"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={handleRemove}>
              Remove Key
            </Button>
            <p className="text-xs text-neutral-500">
              Removing your key will fall back to the server&apos;s default key
              (if one is configured).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
              <p className="mb-3 text-sm text-neutral-300">
                Get your API key from{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 underline transition-colors duration-300 hover:text-amber-300"
                >
                  console.anthropic.com
                </a>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  placeholder="sk-ant-api03-..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <Button onClick={handleSave} disabled={!inputValue.trim()} className="min-h-[44px] sm:min-h-0 shrink-0">
                  {saved ? "Saved!" : "Save"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              Your key is stored locally in your browser. It&apos;s never sent
              anywhere except Anthropic&apos;s API.
            </p>
          </div>
        )}
      </Card>

      <Card className="mt-4 p-4 sm:mt-6 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-neutral-100">
          ElevenLabs API Key
        </h2>
        <p className="mb-4 text-sm text-neutral-400">
          Unbottle uses ElevenLabs to generate AI audio. Provide your own API
          key to enable audio generation, or use the default server key if
          available.
        </p>

        {hasElevenLabsKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-emerald-400">
                      Your key is active
                    </span>
                    <p className="mt-0.5 font-mono text-xs text-neutral-500">
                      {showElKey
                        ? elevenLabsKey
                        : `${elevenLabsKey?.slice(0, 12)}...${elevenLabsKey?.slice(-4)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowElKey(!showElKey)}
                    className="text-xs text-neutral-500 transition-colors duration-300 hover:text-neutral-300"
                  >
                    {showElKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={handleElRemove}>
              Remove Key
            </Button>
            <p className="text-xs text-neutral-500">
              Removing your key will fall back to the server&apos;s default key
              (if one is configured).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
              <p className="mb-3 text-sm text-neutral-300">
                Get your API key from{" "}
                <a
                  href="https://elevenlabs.io/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 underline transition-colors duration-300 hover:text-amber-300"
                >
                  elevenlabs.io
                </a>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  placeholder="xi-..."
                  value={elInputValue}
                  onChange={(e) => setElInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleElSave()}
                />
                <Button onClick={handleElSave} disabled={!elInputValue.trim()} className="min-h-[44px] sm:min-h-0 shrink-0">
                  {elSaved ? "Saved!" : "Save"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              Your key is stored locally in your browser. It&apos;s never sent
              anywhere except ElevenLabs&apos; API.
            </p>
          </div>
        )}
      </Card>

      {/* Session Defaults */}
      <Card className="mt-4 p-4 sm:mt-6 sm:p-6">
        <div className="flex items-baseline gap-2">
          <h2 className="mb-1 text-lg font-semibold text-neutral-100">
            Session Defaults
          </h2>
          <SavedIndicator show={prefSaved} />
        </div>
        <p className="mb-4 text-sm text-neutral-400">
          Default values when creating a new session. You can always override
          these per-session.
        </p>

        <div className="space-y-5">
          {/* Default BPM */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="default-bpm"
              className="text-sm font-medium text-neutral-300"
            >
              Default BPM
            </label>
            <div className="flex items-center gap-3">
              <input
                id="default-bpm"
                type="range"
                min={60}
                max={200}
                value={preferences.defaultBpm}
                onChange={(e) => {
                  updatePreference("defaultBpm", Number(e.target.value));
                  showPrefSaved();
                }}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-amber-500 touch-pan-x"
              />
              <span className="w-12 text-right font-mono text-sm font-bold text-amber-400 tabular-nums">
                {preferences.defaultBpm}
              </span>
            </div>
          </div>

          {/* Default Genre */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="default-genre"
              className="text-sm font-medium text-neutral-300"
            >
              Default Genre
            </label>
            <select
              id="default-genre"
              value={preferences.defaultGenre}
              onChange={(e) => {
                updatePreference("defaultGenre", e.target.value);
                showPrefSaved();
              }}
              className="h-11 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-100 transition-colors duration-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g || "None"}
                </option>
              ))}
            </select>
          </div>

          {/* Default Mood */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="default-mood"
              className="text-sm font-medium text-neutral-300"
            >
              Default Mood
            </label>
            <select
              id="default-mood"
              value={preferences.defaultMood}
              onChange={(e) => {
                updatePreference("defaultMood", e.target.value);
                showPrefSaved();
              }}
              className="h-11 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-100 transition-colors duration-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {MOOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m || "None"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Focus & Workflow */}
      <Card className="mt-4 p-4 sm:mt-6 sm:p-6">
        <div className="flex items-baseline gap-2">
          <h2 className="mb-1 text-lg font-semibold text-neutral-100">
            Focus & Workflow
          </h2>
          <SavedIndicator show={prefSaved} />
        </div>
        <p className="mb-4 text-sm text-neutral-400">
          Tune how Unbottle supports your creative flow.
        </p>

        <div className="space-y-5">
          {/* Hyperfocus Timer */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="hyperfocus-minutes"
              className="text-sm font-medium text-neutral-300"
            >
              Hyperfocus Timer
            </label>
            <p className="text-xs text-neutral-500">
              Get a nudge after this many minutes of continuous work.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="hyperfocus-minutes"
                type="range"
                min={15}
                max={120}
                step={5}
                value={preferences.hyperfocusMinutes}
                onChange={(e) => {
                  updatePreference(
                    "hyperfocusMinutes",
                    Number(e.target.value),
                  );
                  showPrefSaved();
                }}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-amber-500 touch-pan-x"
              />
              <span className="w-16 text-right font-mono text-sm font-bold text-amber-400 tabular-nums">
                {preferences.hyperfocusMinutes}m
              </span>
            </div>
          </div>

          {/* Auto-save */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <label
                htmlFor="auto-save"
                className="text-sm font-medium text-neutral-300"
              >
                Auto-save
              </label>
              <p className="text-xs text-neutral-500">
                Automatically save changes as you work.
              </p>
            </div>
            <button
              id="auto-save"
              role="switch"
              type="button"
              aria-checked={preferences.autoSaveEnabled}
              onClick={() => {
                updatePreference(
                  "autoSaveEnabled",
                  !preferences.autoSaveEnabled,
                );
                showPrefSaved();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:ring-offset-2 focus:ring-offset-neutral-950 ${
                preferences.autoSaveEnabled ? "bg-amber-500" : "bg-neutral-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-300 ${
                  preferences.autoSaveEnabled
                    ? "translate-x-5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-4 sm:mt-6 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-neutral-100">
          How it works
        </h2>
        <ul className="space-y-2 text-sm text-neutral-400">
          <li className="flex gap-2">
            <span className="font-mono text-amber-400">1.</span>
            If you provide your own key, all AI requests use your Anthropic
            account directly.
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-amber-400">2.</span>
            If you have a Claude Pro/Team subscription, you can generate an API
            key at console.anthropic.com — your subscription credits apply.
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-amber-400">3.</span>
            If no key is set, Unbottle uses a shared server key (when
            available).
          </li>
        </ul>
      </Card>
    </div>
  );
}
