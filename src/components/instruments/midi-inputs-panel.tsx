"use client";

import { useMIDIInputs } from "@/lib/hooks/use-midi-inputs";

export function MIDIInputsPanel() {
  const { isSupported, inputs, error, refresh } = useMIDIInputs();

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-neutral-700 p-4">
        <h3 className="text-sm font-medium text-neutral-200 mb-1">MIDI Controllers</h3>
        <p className="text-xs text-neutral-500">
          Web MIDI is not supported in this browser. Try Chrome or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-neutral-200">MIDI Controllers</h3>
        <button
          onClick={refresh}
          className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Refresh MIDI device list"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      {inputs.length === 0 ? (
        <p className="text-xs text-neutral-500">
          No MIDI inputs detected. Connect a controller and click Refresh.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {inputs.map((input) => (
            <li
              key={input.id}
              className="flex items-center gap-3 rounded-lg bg-neutral-800 px-3 py-2"
            >
              <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-neutral-100 truncate">{input.name}</p>
                {input.manufacturer && input.manufacturer !== "Unknown" && (
                  <p className="text-xs text-neutral-500 truncate">{input.manufacturer}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
