"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DrumSequencerEngine,
  VOICE_NAMES,
  STEPS,
  VOICE_COUNT,
  createEmptyGrid,
  type DrumGrid,
  type DrumSequencerParams,
} from "@/lib/audio/drum-sequencer-engine";

interface Props {
  initialParams?: Partial<DrumSequencerParams>;
}

export function DrumMachine({ initialParams }: Props) {
  const [grid, setGrid] = useState<DrumGrid>(() =>
    initialParams?.grid ?? createEmptyGrid(),
  );
  const [bpm, setBpm] = useState(initialParams?.bpm ?? 120);
  const [voiceVolumes, setVoiceVolumes] = useState<number[]>(
    () => initialParams?.voiceVolumes ?? new Array(VOICE_COUNT).fill(0.8),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const engineRef = useRef<DrumSequencerEngine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const getEngine = useCallback((): DrumSequencerEngine => {
    if (!engineRef.current) {
      ctxRef.current = new AudioContext();
      engineRef.current = new DrumSequencerEngine(ctxRef.current, {
        bpm,
        grid,
        voiceVolumes,
      });
      engineRef.current.onStep = (step) => setCurrentStep(step);
    }
    return engineRef.current;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    engineRef.current?.updateParams({ bpm, grid, voiceVolumes });
  }, [bpm, grid, voiceVolumes]);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      ctxRef.current?.close();
    };
  }, []);

  function togglePlay() {
    const engine = getEngine();
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    if (isPlaying) {
      engine.stop();
      setCurrentStep(-1);
      setIsPlaying(false);
    } else {
      engine.start();
      setIsPlaying(true);
    }
  }

  function toggleStep(voiceIdx: number, stepIdx: number) {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[voiceIdx][stepIdx] = !next[voiceIdx][stepIdx];
      return next;
    });
  }

  function handleVoiceVolume(voiceIdx: number, value: number) {
    setVoiceVolumes((prev) => {
      const next = [...prev];
      next[voiceIdx] = value;
      return next;
    });
  }

  function clearGrid() {
    setGrid(createEmptyGrid());
  }

  const VOICE_COLORS: Record<string, string> = {
    kick: "bg-orange-500",
    snare: "bg-yellow-500",
    hihat_closed: "bg-cyan-500",
    hihat_open: "bg-sky-400",
    clap: "bg-pink-500",
    tom_hi: "bg-green-500",
    tom_lo: "bg-emerald-600",
    rim: "bg-purple-500",
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-neutral-900 rounded-xl text-white select-none overflow-x-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
          Drum Machine
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            BPM
            <input
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-16 bg-neutral-800 rounded px-2 py-0.5 text-center"
            />
          </label>
          <button
            onClick={clearGrid}
            className="px-3 py-1 rounded text-xs bg-neutral-700 hover:bg-neutral-600"
          >
            Clear
          </button>
          <button
            onClick={togglePlay}
            className={`px-4 py-1.5 rounded text-xs font-semibold transition-colors ${
              isPlaying
                ? "bg-red-600 hover:bg-red-700"
                : "bg-violet-600 hover:bg-violet-700"
            }`}
          >
            {isPlaying ? "Stop" : "Play"}
          </button>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-0.5 ml-28">
        {Array.from({ length: STEPS }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i === currentStep ? "bg-white" : i % 4 === 0 ? "bg-neutral-600" : "bg-neutral-800"
            }`}
          />
        ))}
      </div>

      {/* Grid rows */}
      <div className="flex flex-col gap-1.5">
        {VOICE_NAMES.map((voiceName, vIdx) => (
          <div key={voiceName} className="flex items-center gap-2">
            {/* Voice label + volume */}
            <div className="flex flex-col gap-0.5 w-24 flex-shrink-0">
              <span className="text-xs font-medium capitalize text-neutral-300">
                {voiceName.replace("_", " ")}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={voiceVolumes[vIdx]}
                onChange={(e) =>
                  handleVoiceVolume(vIdx, Number(e.target.value))
                }
                className="accent-violet-500 w-full"
              />
            </div>

            {/* Step buttons */}
            <div className="flex gap-0.5">
              {Array.from({ length: STEPS }, (_, sIdx) => {
                const active = grid[vIdx][sIdx];
                const isCurrent = sIdx === currentStep && isPlaying;
                const color = VOICE_COLORS[voiceName] ?? "bg-violet-500";
                return (
                  <button
                    key={sIdx}
                    onClick={() => toggleStep(vIdx, sIdx)}
                    className={`w-7 h-7 rounded transition-all ${
                      sIdx % 4 === 0 ? "rounded-l-none" : ""
                    } ${
                      active
                        ? `${color} opacity-${isCurrent ? "100" : "80"}`
                        : `bg-neutral-800 hover:bg-neutral-700 ${
                            isCurrent ? "ring-1 ring-white" : ""
                          }`
                    } ${isCurrent && active ? "scale-105" : ""}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
