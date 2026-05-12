"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SubtractiveSynth as SynthEngine,
  type SynthParams,
  DEFAULT_SYNTH_PARAMS,
  type WaveformType,
} from "@/lib/audio/synth-engine";

const WAVEFORMS: WaveformType[] = ["sine", "triangle", "sawtooth", "square"];

interface Props {
  initialParams?: Partial<SynthParams>;
}

export function SubtractiveSynth({ initialParams }: Props) {
  const [params, setParams] = useState<SynthParams>({
    ...DEFAULT_SYNTH_PARAMS,
    ...initialParams,
  });
  const synthRef = useRef<SynthEngine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const getSynth = useCallback((): SynthEngine => {
    if (!synthRef.current) {
      ctxRef.current = new AudioContext();
      synthRef.current = new SynthEngine(ctxRef.current, params);
    }
    return synthRef.current;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    synthRef.current?.updateParams(params);
  }, [params]);

  useEffect(() => {
    return () => {
      synthRef.current?.dispose();
      ctxRef.current?.close();
    };
  }, []);

  function handleParamChange<K extends keyof SynthParams>(
    key: K,
    value: SynthParams[K],
  ) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  // Mouse-based keyboard handlers
  function handleKeyDown(midi: number) {
    const synth = getSynth();
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }
    synth.noteOn(midi);
  }

  function handleKeyUp(midi: number) {
    synthRef.current?.noteOff(midi);
  }

  const keys = Array.from({ length: 25 }, (_, i) => i + 48); // C3–C5

  return (
    <div className="flex flex-col gap-4 p-4 bg-neutral-900 rounded-xl text-white select-none">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
        Subtractive Synth
      </h2>

      {/* Oscillator */}
      <section>
        <p className="text-xs text-neutral-500 mb-1">Oscillator</p>
        <div className="flex gap-2">
          {WAVEFORMS.map((w) => (
            <button
              key={w}
              onClick={() => handleParamChange("waveform", w)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                params.waveform === w
                  ? "bg-violet-600 text-white"
                  : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </section>

      {/* Filter */}
      <section>
        <p className="text-xs text-neutral-500 mb-1">Filter</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs">
            Cutoff ({Math.round(params.filterCutoff)} Hz)
            <input
              type="range"
              min={80}
              max={18000}
              step={10}
              value={params.filterCutoff}
              onChange={(e) =>
                handleParamChange("filterCutoff", Number(e.target.value))
              }
              className="accent-violet-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Resonance ({params.filterResonance.toFixed(1)})
            <input
              type="range"
              min={0.1}
              max={30}
              step={0.1}
              value={params.filterResonance}
              onChange={(e) =>
                handleParamChange("filterResonance", Number(e.target.value))
              }
              className="accent-violet-500"
            />
          </label>
        </div>
      </section>

      {/* ADSR */}
      <section>
        <p className="text-xs text-neutral-500 mb-1">Envelope</p>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              { key: "attack", label: "A", min: 0.001, max: 4, step: 0.001 },
              { key: "decay", label: "D", min: 0.001, max: 4, step: 0.001 },
              { key: "sustain", label: "S", min: 0, max: 1, step: 0.01 },
              { key: "release", label: "R", min: 0.001, max: 8, step: 0.001 },
            ] as const
          ).map(({ key, label, min, max, step }) => (
            <label key={key} className="flex flex-col items-center gap-1 text-xs">
              {label}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={params[key]}
                onChange={(e) =>
                  handleParamChange(key, Number(e.target.value))
                }
                className="accent-violet-500 w-full"
                style={{ writingMode: "vertical-lr", height: 80, direction: "rtl" }}
              />
              <span className="text-neutral-400">
                {params[key] < 1 ? params[key].toFixed(2) : params[key].toFixed(1)}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Volume */}
      <section>
        <label className="flex flex-col gap-1 text-xs">
          Volume ({Math.round(params.volume * 100)}%)
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={params.volume}
            onChange={(e) =>
              handleParamChange("volume", Number(e.target.value))
            }
            className="accent-violet-500"
          />
        </label>
      </section>

      {/* Mini keyboard */}
      <section>
        <p className="text-xs text-neutral-500 mb-2">Keyboard</p>
        <div className="flex gap-0.5 overflow-x-auto">
          {keys.map((midi) => {
            const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
            return (
              <button
                key={midi}
                onMouseDown={() => handleKeyDown(midi)}
                onMouseUp={() => handleKeyUp(midi)}
                onMouseLeave={() => handleKeyUp(midi)}
                className={`flex-shrink-0 rounded-b border border-neutral-700 active:opacity-60 transition-opacity ${
                  isBlack
                    ? "bg-neutral-800 w-5 h-14"
                    : "bg-white w-7 h-20"
                }`}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
