"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, Section, Track } from "@/lib/music/types";

export interface ChatContext {
  bpm?: number;
  keySignature?: string;
  timeSignature?: string;
  genre?: string;
  mood?: string;
  sections?: Section[];
  tracks?: Track[];
}

export interface UseChatOptions {
  sessionId: string;
  context?: ChatContext;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  isStreaming: boolean;
  clearMessages: () => void;
}

interface SSEEvent {
  type: "token" | "done" | "error";
  content?: string;
}

function createId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useChat({ sessionId, context }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ChatMessage = {
        id: createId(),
        sessionId,
        role: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };

      const assistantId = createId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        sessionId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: content.trim(),
            context,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error ?? `Request failed with status ${response.status}`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");

          // Keep the last incomplete line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6);
            let event: SSEEvent;
            try {
              event = JSON.parse(jsonStr) as SSEEvent;
            } catch {
              continue;
            }

            if (event.type === "token" && event.content) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + event.content }
                    : msg,
                ),
              );
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        content:
                          event.content ?? "Something went wrong. Try again.",
                      }
                    : msg,
                ),
              );
            }
            // "done" events just signal stream end, handled by the loop exiting
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        const errorContent =
          err instanceof Error ? err.message : "Something went wrong.";

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: errorContent }
              : msg,
          ),
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [sessionId, context, isStreaming],
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, sendMessage, isStreaming, clearMessages };
}
