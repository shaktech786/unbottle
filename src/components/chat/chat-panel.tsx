"use client";

import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from "react";
import { cn } from "@/lib/utils/cn";
import { useChat, type ChatContext, type ChatErrorType } from "@/lib/hooks/use-chat";
import { getAuthHeaders } from "@/lib/hooks/use-api-key";
import { useToast } from "@/components/ui/toast-provider";
import type { Suggestion, Section } from "@/lib/music/types";
import Link from "next/link";
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
  onGenerateArrangement?: (sections: Omit<Section, "id" | "sessionId">[], meta?: { key?: string; bpm?: number }) => void;
  /** Called when user wants to place chord notes into the sequencer */
  onAddChordsToSequencer?: () => void;
  /** Ref that parent can use to programmatically send messages */
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

export function ChatPanel({
  sessionId,
  context,
  suggestions,
  decisionContext,
  apiKey,
  onGenerateArrangement,
  onAddChordsToSequencer,
  sendMessageRef,
  className,
}: ChatPanelProps) {
  const { messages, sendMessage, isStreaming, chatError } = useChat({
    sessionId,
    context,
    apiKey,
  });
  const { addToast } = useToast();
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
        key?: string;
        bpm?: number;
      };
      if (data.sections?.length) {
        onGenerateArrangement(data.sections, { key: data.key, bpm: data.bpm });
        // After arrangement is generated, auto-place chords in sequencer
        // (small delay to allow sections to propagate through state)
        if (onAddChordsToSequencer) {
          setTimeout(() => onAddChordsToSequencer(), 500);
        }
      }
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : "Failed to generate arrangement",
        variant: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [messages, onGenerateArrangement, onAddChordsToSequencer, isGenerating, apiKey, context, addToast]);

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

      {/* Generate Arrangement from Chat + Add Chords to Sequencer */}
      {onGenerateArrangement && messages.length > 0 && !isStreaming && (
        <div className="flex flex-col items-center gap-2 border-t border-neutral-800/50 px-4 py-2">
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

          {/* Show "Add Chords to Sequencer" when sections with chords already exist */}
          {onAddChordsToSequencer && context?.sections && context.sections.length > 0 &&
            context.sections.some((s) => s.chordProgression?.length > 0) && (
            <button
              onClick={onAddChordsToSequencer}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-300 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add Chords to Sequencer
            </button>
          )}
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
          AI chat requires an API key.{" "}
          <Link
            href="/settings"
            className="font-medium underline underline-offset-2 hover:text-amber-300"
          >
            Add one in Settings
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
