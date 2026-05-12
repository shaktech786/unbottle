"use client";

import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import {
  savePreset,
  listPresets,
  deletePreset,
  type InstrumentPreset,
  type StoredPreset,
  type InstrumentPresetType,
} from "@/lib/audio/instrument-presets";

interface Props {
  /** Current instrument state to save */
  currentPreset: InstrumentPreset;
  /** Called when user loads a preset */
  onLoad: (preset: InstrumentPreset) => void;
  /** Filter to only show presets of this type */
  filterType?: InstrumentPresetType;
}

export function PresetManager({ currentPreset, onLoad, filterType }: Props) {
  const [presets, setPresets] = useState<StoredPreset[]>([]);
  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);

  const refreshPresets = useCallback(async () => {
    const list = await listPresets(filterType);
    setPresets(list);
  }, [filterType]);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets]);

  async function handleSave() {
    const name = newName.trim();
    if (!name) return;
    const id = nanoid();
    await savePreset(id, name, currentPreset);
    setNewName("");
    setStatus("Saved");
    await refreshPresets();
    setTimeout(() => setStatus(null), 1500);
  }

  async function handleLoad() {
    if (!selectedId) return;
    const preset = presets.find((p) => p.id === selectedId);
    if (preset) {
      onLoad(preset.preset);
      setStatus("Loaded");
      setTimeout(() => setStatus(null), 1500);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    await deletePreset(selectedId);
    setSelectedId("");
    setStatus("Deleted");
    await refreshPresets();
    setTimeout(() => setStatus(null), 1500);
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-neutral-800 rounded-lg text-white">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Presets
        </p>
        {status && (
          <span className="text-xs text-violet-400">{status}</span>
        )}
      </div>

      {/* Save new preset */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Preset name..."
          className="flex-1 bg-neutral-700 rounded px-3 py-1.5 text-xs placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button
          onClick={handleSave}
          disabled={!newName.trim()}
          className="px-3 py-1.5 rounded text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>

      {/* Preset selector */}
      {presets.length > 0 ? (
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 bg-neutral-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="">Select a preset...</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoad}
            disabled={!selectedId}
            className="px-3 py-1.5 rounded text-xs bg-neutral-600 hover:bg-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Load
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedId}
            className="px-3 py-1.5 rounded text-xs bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Del
          </button>
        </div>
      ) : (
        <p className="text-xs text-neutral-600">No presets saved yet.</p>
      )}
    </div>
  );
}
