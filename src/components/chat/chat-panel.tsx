"use client";

import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import { useChat, type ChatContext } from "@/lib/hooks/use-chat";
import type { Suggestion } from "@/lib/music/types";
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
  className,
}: ChatPanelProps) {
  const { messages, sendMessage, isStreaming } = useChat({
    sessionId,
    context,
    apiKey,
  });

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

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-slate-950",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Producer Chat</h2>
        {isStreaming && (
          <span className="text-xs text-indigo-400">Thinking...</span>
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

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
