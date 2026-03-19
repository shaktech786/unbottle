"use client";

import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from "react";
import { cn } from "@/lib/utils/cn";
import { useChat, type ChatContext } from "@/lib/hooks/use-chat";
import { getAuthHeaders } from "@/lib/hooks/use-api-key";
import type { Suggestion, Section } from "@/lib/music/types";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { SuggestionChips } from "./suggestion-chips";
import { JustPickButton } from "./just-pick-button";

interface ChatPanelProps {
  sessionId: string;
  context?: ChatContext;
  suggestions?: Suggestion[];
  decisionContext?: string;
  apiKey?: string | null;
  onGenerateArrangement?: (sections: Omit<Section, "id" | "sessionId">[]) => void;
  /** Ref that parent can use to programmatically send messages */
  sendMessageRef?: MutableRefObject<((msg: string) => void) | null>;
  className?: string;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: "starter-1",
    label: "Help me find a chord progression",
    action: "I want to find a chord progression that fits my vibe",
    category: "arrangement",
  },
  {
    id: "starter-2",
    label: "Suggest a song structure",
    action: "Can you suggest a song structure for me?",
    category: "structure",
  },
  {
    id: "starter-3",
    label: "What instrument should I start with?",
    action: "What instrument should I lay down first?",
    category: "instrument",
  },
];

export function ChatPanel({
  sessionId,
  context,
  suggestions,
  decisionContext,
  apiKey,
  onGenerateArrangement,
  sendMessageRef,
  className,
}: ChatPanelProps) {
  const { messages, sendMessage, isStreaming } = useChat({
    sessionId,
    context,
    apiKey,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Expose sendMessage to parent via ref
  useEffect(() => {
    if (sendMessageRef) {
      sendMessageRef.current = sendMessage;
    }
    return () => {
      if (sendMessageRef) {
        sendMessageRef.current = null;
      }
    };
  }, [sendMessage, sendMessageRef]);

  const activeSuggestions = useMemo(
    () =>
      messages.length === 0
        ? suggestions ?? DEFAULT_SUGGESTIONS
        : suggestions ?? [],
    [messages.length, suggestions],
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      sendMessage(suggestion.action);
    },
    [sendMessage],
  );

  const handleJustPick = useCallback(
    (message: string) => {
      sendMessage(message);
    },
    [sendMessage],
  );

  const handleGenerateArrangement = useCallback(async () => {
    if (!onGenerateArrangement || isGenerating) return;
    setIsGenerating(true);

    // Summarize the conversation to use as the arrangement prompt
    const conversationSummary = messages
      .filter((m) => m.content)
      .slice(-10)
      .map((m) => `${m.role === "user" ? "User" : "Producer"}: ${m.content}`)
      .join("\n");

    const prompt = conversationSummary
      ? `Based on this conversation, generate an arrangement:\n\n${conversationSummary}`
      : "Generate a standard pop song arrangement";

    try {
      const res = await fetch("/api/arrangement/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(apiKey ?? null),
        },
        body: JSON.stringify({
          prompt,
          key: context?.keySignature,
          genre: context?.genre,
          mood: context?.mood,
          existingSections: context?.sections,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to generate arrangement");
      }

      const data = (await res.json()) as {
        sections: Omit<Section, "id" | "sessionId">[];
      };
      if (data.sections?.length) {
        onGenerateArrangement(data.sections);
      }
    } catch {
      // Could display error in chat, but keeping it simple
    } finally {
      setIsGenerating(false);
    }
  }, [messages, onGenerateArrangement, isGenerating, apiKey, context]);

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-neutral-950",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/50 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-200">Producer</h2>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
            Thinking...
          </span>
        )}
      </div>

      {/* Messages */}
      <MessageList messages={messages} className="flex-1" />

      {/* Suggestions */}
      {activeSuggestions.length > 0 && !isStreaming && (
        <SuggestionChips
          suggestions={activeSuggestions}
          onSelect={handleSuggestionSelect}
        />
      )}

      {/* Just Pick Button */}
      {decisionContext && !isStreaming && (
        <div className="flex justify-center px-4 py-2">
          <JustPickButton
            context={decisionContext}
            onPick={handleJustPick}
            disabled={isStreaming}
          />
        </div>
      )}

      {/* Generate Arrangement from Chat */}
      {onGenerateArrangement && messages.length > 0 && !isStreaming && (
        <div className="flex justify-center border-t border-neutral-800/50 px-4 py-2">
          <button
            onClick={handleGenerateArrangement}
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-300",
              isGenerating
                ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            {isGenerating ? "Generating..." : "Generate Arrangement from Chat"}
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
