"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./audio-player";
import { useAudioGenerator } from "@/lib/hooks/use-audio-generator";
import { useElevenLabsKey } from "@/lib/hooks/use-elevenlabs-key";
import { buildMusicPrompt } from "@/lib/audio/music-prompt";
import { cn } from "@/lib/utils/cn";

export interface GeneratePanelProps {
  open: boolean;
  onClose: () => void;
  /** Pre-populated from session context */
  genre?: string;
  mood?: string;
  bpm?: number;
  keySignature?: string;
  className?: string;
}

interface SectionPreset {
  label: string;
  sectionType: string;
}

const SECTION_PRESETS: SectionPreset[] = [
  { label: "Verse", sectionType: "verse" },
  { label: "Chorus", sectionType: "chorus" },
  { label: "Full Track", sectionType: "" },
];

export function GeneratePanel({
  open,
  onClose,
  genre,
  mood,
  bpm,
  keySignature,
  className,
}: GeneratePanelProps) {
  const { apiKey } = useElevenLabsKey();
  const {
    generate,
    isGenerating,
    progress,
    audioUrl,
    error,
    reset,
  } = useAudioGenerator(apiKey);

  // Track slow generation (>30s).
  // We store when generation started and use a timer to flip a flag.
  // The flag auto-resets because `isGenerating` gates the display below.
  const [slowHintReady, setSlowHintReady] = useState(false);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = setTimeout(() => setSlowHintReady(true), 30_000);
    return () => {
      clearTimeout(timer);
      setSlowHintReady(false);
    };
  }, [isGenerating]);

  const showSlowHint = isGenerating && slowHintReady;

  // Compute default prompt from session context (shown as placeholder)
  const defaultPrompt = useMemo(
    () => buildMusicPrompt({ genre, mood, bpm, keySignature }),
    [genre, mood, bpm, keySignature],
  );

  // Local form state
  const [promptOverride, setPromptOverride] = useState("");
  const [duration, setDuration] = useState(30);
  const [forceInstrumental, setForceInstrumental] = useState(true);

  // Effective prompt: user override wins, otherwise use computed default
  const effectivePrompt = promptOverride.trim() || defaultPrompt;

  const handleGenerate = useCallback(
    async (sectionType?: string) => {
      await generate({
        prompt: effectivePrompt,
        genre,
        mood,
        bpm,
        keySignature,
        sectionType: sectionType || undefined,
        duration,
        forceInstrumental,
      });
    },
    [generate, effectivePrompt, genre, mood, bpm, keySignature, duration, forceInstrumental],
  );

  const handleClose = useCallback(() => {
    reset();
    setPromptOverride("");
    onClose();
  }, [reset, onClose]);

  return (
    <Dialog open={open} onClose={handleClose} title="AI Audio Generation" className={className}>
      <div className="flex flex-col gap-4">
        {/* Missing key warning */}
        {!apiKey && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <p className="text-xs text-amber-400">
              Audio generation requires an ElevenLabs API key.{" "}
              <Link
                href="/settings"
                className="font-medium underline underline-offset-2 hover:text-amber-300"
              >
                Add one in Settings
              </Link>
            </p>
          </div>
        )}

        {/* Prompt textarea */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="music-prompt" className="text-sm font-medium text-slate-300">
            Prompt
          </label>
          <textarea
            id="music-prompt"
            value={promptOverride}
            onChange={(e) => setPromptOverride(e.target.value)}
            placeholder={defaultPrompt}
            rows={3}
            disabled={isGenerating}
            className={cn(
              "w-full resize-none rounded-lg border bg-slate-900 px-3 py-2 text-sm text-slate-50",
              "border-slate-700 placeholder:text-slate-500",
              "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          {!promptOverride && (
            <p className="text-[10px] text-slate-600">
              Leave blank to use the auto-generated prompt from session context
            </p>
          )}
        </div>

        {/* Duration slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="duration-slider" className="text-sm font-medium text-slate-300">
              Duration
            </label>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {duration}s
            </span>
          </div>
          <input
            id="duration-slider"
            type="range"
            min={5}
            max={120}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isGenerating}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>5s</span>
            <span>120s</span>
          </div>
        </div>

        {/* Force Instrumental toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-slate-300">
              Force Instrumental
            </span>
            <p className="text-xs text-slate-500">
              Suppress vocal content in generated audio
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={forceInstrumental}
            onClick={() => setForceInstrumental(!forceInstrumental)}
            disabled={isGenerating}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
              "disabled:cursor-not-allowed disabled:opacity-50",
              forceInstrumental ? "bg-indigo-600" : "bg-slate-700",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                forceInstrumental ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-300">Quick Generate</span>
          <div className="flex gap-2">
            {SECTION_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="secondary"
                size="sm"
                disabled={isGenerating}
                onClick={() => handleGenerate(preset.sectionType)}
                className="flex-1"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <Button
          variant="primary"
          onClick={() => handleGenerate()}
          loading={isGenerating}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? progress || "Generating..." : "Generate Audio"}
        </Button>

        {/* Slow generation hint */}
        {isGenerating && showSlowHint && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <p className="text-xs text-amber-400">
              This can take up to a minute for longer tracks...
            </p>
          </div>
        )}

        {/* Error with retry */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => handleGenerate()}
              className="mt-2 rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
            >
              Retry
            </button>
          </div>
        )}

        {/* Audio player */}
        {audioUrl && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-emerald-400">
              Generation complete
            </span>
            <AudioPlayer src={audioUrl} />
          </div>
        )}

        {/* Close */}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
