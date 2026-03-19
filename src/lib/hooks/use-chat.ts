"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage, Section, Track } from "@/lib/music/types";
import { getAuthHeaders } from "@/lib/hooks/use-api-key";

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
  apiKey?: string | null;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  isStreaming: boolean;
  clearMessages: () => void;
  isLoadingHistory: boolean;
}

interface SSEEvent {
  type: "token" | "done" | "error";
  content?: string;
}

function createId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Persist a completed message pair to the server
async function persistMessages(sessionId: string, userMsg: ChatMessage, assistantMsg: ChatMessage) {
  try {
    await fetch(`/api/session/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [userMsg, assistantMsg] }),
    });
  } catch {
    // Non-critical — messages are still in client state
  }
}

export function useChat({ sessionId, context, apiKey }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Load chat history on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoadingHistory(true);

    fetch(`/api/session/${sessionId}/messages`)
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data: { messages?: ChatMessage[] }) => {
        if (!cancelled && data.messages?.length) {
          setMessages(data.messages);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

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
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(apiKey ?? null),
          },
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
        let fullContent = "";

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
              fullContent += event.content;
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
          }
        }

        // Persist both messages to server after stream completes
        if (fullContent) {
          const finalAssistant = { ...assistantMessage, content: fullContent };
          persistMessages(sessionId, userMessage, finalAssistant);
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
    [sessionId, context, isStreaming, apiKey],
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, sendMessage, isStreaming, clearMessages, isLoadingHistory };
}
