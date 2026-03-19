"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioRecorder } from "@/lib/audio/recorder";

export type PermissionState = "prompt" | "granted" | "denied" | "unknown";

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  audioBlob: Blob | null;
  audioUrl: string | null;
  analyserNode: AnalyserNode | null;
  error: string | null;
  permissionState: PermissionState;
  recordingDuration: number; // seconds
}

/**
 * React hook wrapping AudioRecorder.
 *
 * Handles mic permission, recording lifecycle, and cleanup on unmount.
 * Provides an AnalyserNode for real-time waveform visualization.
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] =
    useState<PermissionState>("unknown");
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Check mic permission on mount
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.permissions) {
      setPermissionState("unknown");
      return;
    }

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        setPermissionState(status.state as PermissionState);
        status.onchange = () => {
          setPermissionState(status.state as PermissionState);
        };
      })
      .catch(() => {
        setPermissionState("unknown");
      });
  }, []);

  // Revoke object URL on unmount or when a new recording is made
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);

    // Revoke previous URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      setAudioUrl(null);
    }

    try {
      const recorder = new AudioRecorder("webm");
      recorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);
      setPermissionState("granted");
      setAnalyserNode(recorder.getAnalyser());

      // Start duration timer
      const startTime = Date.now();
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - startTime) / 1000);
      }, 100);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";

      if (message.includes("Permission denied") || message.includes("NotAllowedError")) {
        setPermissionState("denied");
      }

      setError(message);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!recorderRef.current) {
      setIsRecording(false);
      return;
    }

    try {
      const blob = await recorderRef.current.stop();
      setAudioBlob(blob);

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setAudioUrl(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to stop recording",
      );
    } finally {
      setIsRecording(false);
      setAnalyserNode(null);
      recorderRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recorderRef.current?.isRecording) {
        void recorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    audioUrl,
    analyserNode,
    error,
    permissionState,
    recordingDuration,
  };
}
