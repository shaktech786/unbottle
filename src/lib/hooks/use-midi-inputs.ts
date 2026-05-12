"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MIDIInputInfo {
  id: string;
  name: string;
  manufacturer: string;
}

export interface UseMIDIInputsReturn {
  /** Whether Web MIDI API is available in this browser */
  isSupported: boolean;
  /** List of currently connected MIDI input devices */
  inputs: MIDIInputInfo[];
  /** Error message if access was denied or failed */
  error: string | null;
  /** Request/refresh MIDI access (call when re-plugging a device) */
  refresh: () => void;
}

function checkMIDISupport(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.requestMIDIAccess === "function";
}

/**
 * Enumerate Web MIDI API inputs.
 *
 * Calls `navigator.requestMIDIAccess()` once on mount and refreshes when
 * the device state changes (plug/unplug events).
 *
 * Gracefully degrades: if MIDI is not supported (e.g. Firefox without flag,
 * or SSR), `isSupported` is false and `inputs` is empty.
 */
export function useMIDIInputs(): UseMIDIInputsReturn {
  const supported = checkMIDISupport();
  const [inputs, setInputs] = useState<MIDIInputInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const accessRef = useRef<MIDIAccess | null>(null);

  const readInputs = useCallback(() => {
    if (!accessRef.current) return;
    const list: MIDIInputInfo[] = [];
    accessRef.current.inputs.forEach((input) => {
      list.push({
        id: input.id,
        name: input.name || "Unknown Device",
        manufacturer: input.manufacturer || "Unknown",
      });
    });
    setInputs(list);
  }, []);

  const requestAccess = useCallback(() => {
    if (!supported) return;

    navigator.requestMIDIAccess().then(
      (access) => {
        accessRef.current = access;
        readInputs();
        access.onstatechange = () => readInputs();
      },
      (err) => {
        setError(
          err instanceof Error
            ? err.message
            : "MIDI access denied",
        );
      },
    );
  }, [supported, readInputs]);

  useEffect(() => {
    requestAccess();
    return () => {
      // Clean up state change listener
      if (accessRef.current) {
        accessRef.current.onstatechange = null;
      }
    };
  }, [requestAccess]);

  return {
    isSupported: supported,
    inputs,
    error,
    refresh: requestAccess,
  };
}
