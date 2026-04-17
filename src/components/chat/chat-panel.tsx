"use client";

import { useCallback, useEffect, useMemo, type MutableRefObject } from "react";
import { cn } from "@/lib/utils/cn";
import { useChat, type ChatContext, type ChatErrorType, type ChatAction } from "@/lib/hooks/use-chat";
import type { Suggestion } from "@/lib/music/types";
import Link from "next/link";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { SuggestionChips } from "./suggestion-chips";
import { JustPickButton } from "./just-pick-button";

interface ChatPanelProps {
  sessionId: string;
  context?: ChatContext;
  suggestions?: Suggestion[];
  apiKey?: string | null;
  /** Called when the AI uses a tool to perform an action */
  onAction?: (action: ChatAction) => void;
  sendMessageRef?: MutableRefObject<((msg: string) => void) | null>;
  className?: string;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: "starter-1",
    label: "Generate a chord progression for me",
    action: "Generate a chord progression for me. Pick a key, pick a vibe, and give me something I can use right away. Include the chords in a structured arrangement so I can add them to the sequencer.",
    category: "arrangement",
  },
  {
    id: "starter-2",
    label: "Build me a 4-section arrangement",
    action: "Build me a complete 4-section arrangement with chord progressions for each section. Pick a genre and vibe that sounds good together. Make it ready to use.",
    category: "structure",
  },
  {
    id: "starter-3",
    label: "Pick everything for me",
    action: "Pick everything for me -- genre, mood, key, BPM, and build a full arrangement with chord progressions. I want to hear something playing in 30 seconds. Make all the decisions.",
    category: "general",
  },
];

const FOLLOWUP_SUGGESTIONS: Suggestion[] = [
  {
    id: "followup-1",
    label: "Add more instruments",
    action: "Add more instruments to the current arrangement. Layer in something that complements what we already have.",
    category: "instrument",
  },
  {
    id: "followup-2",
    label: "Change the key",
    action: "Change the key of the current arrangement. Pick something that shifts the mood while keeping the same structure.",
    category: "arrangement",
  },
  {
    id: "followup-3",
    label: "Try a different arrangement",
    action: "Give me a completely different arrangement. Keep the same general vibe but rethink the structure and chord choices.",
    category: "structure",
  },
  {
    id: "followup-4",
    label: "Make it more energetic",
    action: "Make the current arrangement more energetic. Increase the tempo feel, add rhythmic drive, and make it hit harder.",
    category: "general",
  },
];

export function ChatPanel({
  sessionId,
  context,
  suggestions,
  apiKey,
  onAction,
  sendMessageRef,
  className,
}: ChatPanelProps) {
  const { messages, sendMessage, regenerate, isStreaming, chatError } = useChat({
    sessionId,
    context,
    apiKey,
    onAction,
  });

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
        : suggestions ?? FOLLOWUP_SUGGESTIONS,
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
        "flex flex-col overflow-hidden bg-neutral-950",
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

      {/* Error banner */}
      <ChatErrorBanner errorType={chatError} />

      {/* Messages */}
      <MessageList messages={messages} isStreaming={isStreaming} className="flex-1" />

      {/* Regenerate button — shown when last message is from assistant and idle */}
      {!isStreaming &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "assistant" && (
          <div className="flex justify-start px-4 pb-1 pt-0">
            <button
              onClick={regenerate}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
              aria-label="Regenerate last response"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Regenerate
            </button>
          </div>
        )}

      {/* Suggestions */}
      {activeSuggestions.length > 0 && !isStreaming && (
        <SuggestionChips
          suggestions={activeSuggestions}
          onSelect={handleSuggestionSelect}
        />
      )}

      {/* Just Pick Button - always available when chat is idle */}
      {messages.length > 0 && !isStreaming && (
        <div className="flex justify-center px-4 py-2">
          <JustPickButton
            context="what to do next"
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

/* ---------- Error banner sub-component ---------- */

function ChatErrorBanner({ errorType }: { errorType: ChatErrorType }) {
  if (!errorType) return null;

  if (errorType === "auth") {
    return (
      <div className="mx-3 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        <p className="text-xs text-amber-400">
          AI is not available right now.{" "}
          <Link
            href="/settings"
            className="font-medium underline underline-offset-2 hover:text-amber-300"
          >
            Try adding your own API key in Settings
          </Link>
        </p>
      </div>
    );
  }

  if (errorType === "network") {
    return (
      <div className="mx-3 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        <p className="text-xs text-amber-400">
          Connection lost. Check your internet and try again.
        </p>
      </div>
    );
  }

  // server / generic
  return (
    <div className="mx-3 mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
      <p className="text-xs text-red-400">
        Something went wrong. Try again.
      </p>
    </div>
  );
}
