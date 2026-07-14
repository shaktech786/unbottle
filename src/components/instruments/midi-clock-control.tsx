"use client";

import { useMIDIClock } from "@/lib/midi/midi-clock";

interface MIDIClockControlProps {
  bpm: number;
  isPlaying: boolean;
}

export function MIDIClockControl({ bpm, isPlaying }: MIDIClockControlProps) {
  const { isRunning, selectedOutputId, outputs, start, stop, setOutputId } =
    useMIDIClock(bpm, isPlaying);

  if (outputs.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Device selector */}
      <select
        value={selectedOutputId ?? ""}
        onChange={(e) => setOutputId(e.target.value || null)}
        className="rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
        aria-label="MIDI clock output device"
      >
        {outputs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>

      {/* Toggle */}
      <button
        onClick={isRunning ? stop : start}
        className={[
          "rounded px-2.5 py-1 text-xs font-medium transition-colors",
          isRunning
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
            : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-500",
        ].join(" ")}
        title={isRunning ? "Disable MIDI clock output" : "Enable MIDI clock output"}
      >
        MIDI Clock {isRunning ? "On" : "Off"}
      </button>
    </div>
  );
}
