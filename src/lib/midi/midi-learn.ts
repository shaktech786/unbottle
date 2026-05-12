"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MIDIMapping {
  /** Unique parameter identifier, e.g. "track:t1:volume" */
  parameterId: string;
  /** MIDI CC number (0-127) */
  ccNumber: number;
  /** MIDI channel (0-15, or -1 to match any channel) */
  channel: number;
}

export interface UseMIDILearnReturn {
  /** All stored mappings */
  mappings: MIDIMapping[];
  /** Parameter currently in learn mode (null = not learning) */
  learningParameterId: string | null;
  /** Start listening for the next CC message to map to parameterId */
  startLearn: (parameterId: string) => void;
  /** Cancel an in-progress learn */
  cancelLearn: () => void;
  /** Remove a mapping for a parameter */
  removeMapping: (parameterId: string) => void;
  /** Clear all mappings */
  clearMappings: () => void;
  /** Get the current value (0-1 normalized) from the last CC for a parameter */
  getParameterValue: (parameterId: string) => number | null;
}

const STORAGE_KEY = "unbottle:midi-mappings";

function loadMappings(): MIDIMapping[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MIDIMapping[];
  } catch {
    return [];
  }
}

function saveMappings(mappings: MIDIMapping[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * MIDI Learn hook.
 *
 * Usage:
 *   const { startLearn, learningParameterId, mappings } = useMIDILearn(midiAccess);
 *
 *   // On knob double-click:
 *   startLearn("track:t1:volume");
 *   // → next CC event is captured and mapped to that parameter
 */
export function useMIDILearn(
  midiAccess: MIDIAccess | null,
): UseMIDILearnReturn {
  const [mappings, setMappings] = useState<MIDIMapping[]>(() => loadMappings());
  const [learningId, setLearningId] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});

  // Keep a ref to latest mappings for use in event handlers
  const mappingsRef = useRef(mappings);
  useEffect(() => {
    mappingsRef.current = mappings;
  }, [mappings]);

  const persistMappings = useCallback((next: MIDIMapping[]) => {
    setMappings(next);
    saveMappings(next);
  }, []);

  const startLearn = useCallback((parameterId: string) => {
    setLearningId(parameterId);
  }, []);

  const cancelLearn = useCallback(() => {
    setLearningId(null);
  }, []);

  const removeMapping = useCallback(
    (parameterId: string) => {
      persistMappings(mappingsRef.current.filter((m) => m.parameterId !== parameterId));
    },
    [persistMappings],
  );

  const clearMappings = useCallback(() => {
    persistMappings([]);
  }, [persistMappings]);

  const getParameterValue = useCallback(
    (parameterId: string): number | null => {
      return paramValues[parameterId] ?? null;
    },
    [paramValues],
  );

  // MIDI message handler
  useEffect(() => {
    if (!midiAccess) return;

    function handleMessage(
      this: MIDIInput,
      event: MIDIMessageEvent,
    ) {
      const data = event.data;
      if (!data || data.length < 3) return;

      const statusByte = data[0];
      const type = statusByte & 0xf0;
      const channel = statusByte & 0x0f;

      // Only care about CC (0xB0) messages
      if (type !== 0xb0) return;

      const ccNumber = data[1];
      const value = data[2]; // 0-127

      setLearningId((currentLearningId) => {
        if (currentLearningId !== null) {
          // In learn mode — map this CC to the parameter
          const next = [
            ...mappingsRef.current.filter(
              (m) => m.parameterId !== currentLearningId,
            ),
            { parameterId: currentLearningId, ccNumber, channel },
          ];
          persistMappings(next);
          return null; // exit learn mode
        }

        // Not in learn mode — apply existing mappings
        const mapping = mappingsRef.current.find(
          (m) =>
            m.ccNumber === ccNumber &&
            (m.channel === -1 || m.channel === channel),
        );

        if (mapping) {
          const normalized = value / 127;
          setParamValues((prev) => ({
            ...prev,
            [mapping.parameterId]: normalized,
          }));
        }

        return null; // no change to learningId
      });
    }

    // Attach to all inputs
    const inputs: MIDIInput[] = [];
    midiAccess.inputs.forEach((input) => {
      input.onmidimessage = handleMessage;
      inputs.push(input);
    });

    return () => {
      for (const input of inputs) {
        input.onmidimessage = null;
      }
    };
  }, [midiAccess, persistMappings]);

  return {
    mappings,
    learningParameterId: learningId,
    startLearn,
    cancelLearn,
    removeMapping,
    clearMappings,
    getParameterValue,
  };
}
