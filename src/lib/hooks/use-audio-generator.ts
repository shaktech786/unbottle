"use client";

import { useState, useCallback, useRef } from "react";
import { getElevenLabsAuthHeaders } from "./use-elevenlabs-key";

export interface GenerateOptions {
  prompt?: string;
  description?: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  keySignature?: string;
  instruments?: string[];
  sectionType?: string;
  duration?: number;
  forceInstrumental?: boolean;
  sessionId?: string;
}

export interface UseAudioGeneratorReturn {
  generate: (options: GenerateOptions) => Promise<void>;
  isGenerating: boolean;
  progress: string;
  audioUrl: string | null;
  audioBlob: Blob | null;
  error: string | null;
  reset: () => void;
}

export function useAudioGenerator(
  elevenLabsKey: string | null,
): UseAudioGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track blob URLs for cleanup
  const currentBlobUrl = useRef<string | null>(null);

  const reset = useCallback(() => {
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = null;
    }
    setIsGenerating(false);
    setProgress("");
    setAudioUrl(null);
    setAudioBlob(null);
    setError(null);
  }, []);

  const generate = useCallback(
    async (options: GenerateOptions) => {
      // Clean up previous blob URL
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
        currentBlobUrl.current = null;
      }

      setIsGenerating(true);
      setProgress("Generating audio...");
      setError(null);
      setAudioUrl(null);
      setAudioBlob(null);

      try {
        setProgress("Sending request to ElevenLabs...");

        const response = await fetch("/api/audio/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getElevenLabsAuthHeaders(elevenLabsKey),
          },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          let errorMessage = `Generation failed (${response.status})`;
          try {
            const errBody = (await response.json()) as { error?: string };
            if (errBody.error) {
              errorMessage = errBody.error;
            }
          } catch {
            // response may not be JSON
          }
          throw new Error(errorMessage);
        }

        setProgress("Processing audio...");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        currentBlobUrl.current = url;

        setAudioBlob(blob);
        setAudioUrl(url);
        setProgress("Complete");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
        setProgress("");
      } finally {
        setIsGenerating(false);
      }
    },
    [elevenLabsKey],
  );

  return {
    generate,
    isGenerating,
    progress,
    audioUrl,
    audioBlob,
    error,
    reset,
  };
}
