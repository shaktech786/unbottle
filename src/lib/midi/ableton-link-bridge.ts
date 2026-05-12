"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Ableton Link uses port 17523 for its WebSocket bridge.
// The bridge is a local app (e.g. link-to-ws) that must be running on the user's machine.
// We connect optimistically and degrade gracefully if not running.
const LINK_WS_URL = "ws://localhost:17523";
const RECONNECT_DELAY_MS = 5000;

export interface AbletionLinkState {
  /** Whether we have an active connection to the Link bridge */
  connected: boolean;
  /** Number of peers on the Link session (including self) */
  peerCount: number;
  /** Current BPM synced from Link (null if not connected) */
  linkedBpm: number | null;
}

export interface UseAbletonLinkReturn extends AbletionLinkState {
  /** Connect to the bridge (called automatically on mount) */
  connect: () => void;
  /** Disconnect from the bridge */
  disconnect: () => void;
}

interface LinkMessage {
  type: "tempo" | "peers" | "beat" | "pong";
  tempo?: number;
  peers?: number;
}

/**
 * Ableton Link integration via WebSocket bridge.
 *
 * The bridge (e.g. `link-to-ws`, `abletonlink-bridge`) must be running
 * locally on port 17523. If not running, the hook degrades gracefully —
 * `connected` stays false, nothing breaks.
 *
 * When connected, it syncs `linkedBpm` from the Link session and reports
 * `peerCount` for the transport bar ("Link: X peers").
 */
export function useAbletonLink(
  onBpmChange?: (bpm: number) => void,
): UseAbletonLinkReturn {
  const [state, setState] = useState<AbletionLinkState>({
    connected: false,
    peerCount: 0,
    linkedBpm: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearReconnect = useCallback(() => {
    if (reconnectTimer.current !== null) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof WebSocket === "undefined") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    clearReconnect();

    let ws: WebSocket;
    try {
      ws = new WebSocket(LINK_WS_URL);
    } catch {
      // WebSocket constructor can throw if the URL is invalid — shouldn't happen here
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, connected: true }));
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data as string) as LinkMessage;
        if (msg.type === "tempo" && typeof msg.tempo === "number") {
          setState((prev) => ({ ...prev, linkedBpm: msg.tempo! }));
          onBpmChange?.(msg.tempo!);
        } else if (msg.type === "peers" && typeof msg.peers === "number") {
          setState((prev) => ({ ...prev, peerCount: msg.peers! }));
        }
      } catch {
        // Non-JSON message — ignore
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setState({ connected: false, peerCount: 0, linkedBpm: null });
      // Reconnect after delay
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      // Error is followed by close — handle everything in onclose
    };
  }, [clearReconnect, onBpmChange]);

  const disconnect = useCallback(() => {
    clearReconnect();
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect
      wsRef.current.close();
      wsRef.current = null;
    }
    setState({ connected: false, peerCount: 0, linkedBpm: null });
  }, [clearReconnect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnect();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect, clearReconnect]);

  return { ...state, connect, disconnect };
}
