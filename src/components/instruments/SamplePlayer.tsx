"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SamplePlayerEngine,
  type SamplePlayerParams,
  DEFAULT_SAMPLE_PLAYER_PARAMS,
} from "@/lib/audio/sample-player-engine";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiToName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

interface Props {
  initialParams?: Partial<SamplePlayerParams>;
}

export function SamplePlayer({ initialParams }: Props) {
  const [params, setParams] = useState<SamplePlayerParams>({
    ...DEFAULT_SAMPLE_PLAYER_PARAMS,
    ...initialParams,
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [hasBuffer, setHasBuffer] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const engineRef = useRef<SamplePlayerEngine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getEngine = useCallback((): SamplePlayerEngine => {
    if (!engineRef.current) {
      ctxRef.current = new AudioContext();
      engineRef.current = new SamplePlayerEngine(ctxRef.current, params);
    }
    return engineRef.current;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    engineRef.current?.updateParams(params);
  }, [params]);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      ctxRef.current?.close();
    };
  }, []);

  async function loadAudioFile(file: File) {
    const engine = getEngine();
    if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();
    await engine.loadFile(file);
    setFileName(file.name);
    setHasBuffer(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadAudioFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadAudioFile(file);
  }

  function handleKeyDown(midi: number) {
    if (!hasBuffer) return;
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    getEngine().noteOn(midi);
  }

  function handleKeyUp(midi: number) {
    engineRef.current?.noteOff(midi);
  }

  function handleParamChange<K extends keyof SamplePlayerParams>(
    key: K,
    value: SamplePlayerParams[K],
  ) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  const keys = Array.from({ length: 25 }, (_, i) => i + 48);

  return (
    <div className="flex flex-col gap-4 p-4 bg-neutral-900 rounded-xl text-white select-none">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
        Sample Player
      </h2>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragOver
            ? "border-violet-500 bg-violet-950/30"
            : "border-neutral-700 hover:border-neutral-500"
        }`}
      >
        {fileName ? (
          <p className="text-sm text-violet-300">{fileName}</p>
        ) : (
          <p className="text-sm text-neutral-500">
            Drop an audio file here or click to browse
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Root note */}
      <label className="flex flex-col gap-1 text-xs">
        Root Note: {midiToName(params.rootNote)} (MIDI {params.rootNote})
        <input
          type="range"
          min={21}
          max={108}
          value={params.rootNote}
          onChange={(e) =>
            handleParamChange("rootNote", Number(e.target.value))
          }
          className="accent-violet-500"
        />
      </label>

      {/* Volume */}
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

      {/* Loop toggle */}
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={params.loop}
          onChange={(e) => handleParamChange("loop", e.target.checked)}
          className="accent-violet-500"
        />
        Loop
      </label>

      {/* Mini keyboard */}
      <section>
        <p className="text-xs text-neutral-500 mb-2">
          Keyboard {!hasBuffer && "(load a sample first)"}
        </p>
        <div className="flex gap-0.5 overflow-x-auto">
          {keys.map((midi) => {
            const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
            return (
              <button
                key={midi}
                disabled={!hasBuffer}
                onMouseDown={() => handleKeyDown(midi)}
                onMouseUp={() => handleKeyUp(midi)}
                onMouseLeave={() => handleKeyUp(midi)}
                className={`flex-shrink-0 rounded-b border border-neutral-700 transition-opacity disabled:opacity-30 active:opacity-60 ${
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
