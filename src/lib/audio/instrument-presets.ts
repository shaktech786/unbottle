/**
 * Instrument preset persistence.
 *
 * Serializes synth/sample/drum state to JSON and stores it in IndexedDB
 * under the "instrument_presets" store. Consistent with the project system
 * that uses the "unbottle" database.
 */

import type { SynthParams } from "./synth-engine";
import type { SamplePlayerParams } from "./sample-player-engine";
import type { DrumSequencerParams } from "./drum-sequencer-engine";

const DB_NAME = "unbottle";
const DB_VERSION = 2; // bump to add the new store
const PRESET_STORE = "instrument_presets";

// ---------------------------------------------------------------------------
// Preset types
// ---------------------------------------------------------------------------

export type InstrumentPresetType = "synth" | "sample_player" | "drum_machine";

export interface SynthPreset {
  type: "synth";
  params: SynthParams;
}

export interface SamplePlayerPreset {
  type: "sample_player";
  params: SamplePlayerParams;
}

export interface DrumMachinePreset {
  type: "drum_machine";
  params: Omit<DrumSequencerParams, "grid"> & { grid: boolean[][] };
}

export type InstrumentPreset =
  | SynthPreset
  | SamplePlayerPreset
  | DrumMachinePreset;

export interface StoredPreset {
  id: string;
  name: string;
  savedAt: string;
  preset: InstrumentPreset;
}

// ---------------------------------------------------------------------------
// IndexedDB access
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
      // Create projects store if upgrading from version 0 (fresh install)
      if (oldVersion < 1 && !db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }
      // Add presets store for version 2
      if (!db.objectStoreNames.contains(PRESET_STORE)) {
        const store = db.createObjectStore(PRESET_STORE, { keyPath: "id" });
        store.createIndex("savedAt", "savedAt");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function savePreset(
  id: string,
  name: string,
  preset: InstrumentPreset,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESET_STORE, "readwrite");
    const store = tx.objectStore(PRESET_STORE);
    const record: StoredPreset = {
      id,
      name,
      savedAt: new Date().toISOString(),
      preset,
    };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function loadPreset(id: string): Promise<StoredPreset | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESET_STORE, "readonly");
    const store = tx.objectStore(PRESET_STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as StoredPreset) ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function listPresets(
  filterType?: InstrumentPresetType,
): Promise<StoredPreset[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESET_STORE, "readonly");
    const store = tx.objectStore(PRESET_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      let results = req.result as StoredPreset[];
      if (filterType) {
        results = results.filter((r) => r.preset.type === filterType);
      }
      results.sort(
        (a, b) =>
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      );
      resolve(results);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function deletePreset(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRESET_STORE, "readwrite");
    const store = tx.objectStore(PRESET_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

export function serializePreset(preset: InstrumentPreset): string {
  return JSON.stringify(preset);
}

export function deserializePreset(raw: string): InstrumentPreset {
  const parsed = JSON.parse(raw) as InstrumentPreset;
  if (!parsed.type) throw new Error("Invalid preset: missing type");
  return parsed;
}
