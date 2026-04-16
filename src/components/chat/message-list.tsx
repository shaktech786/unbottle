"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import type { ChatMessage } from "@/lib/music/types";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  className?: string;
}

/** Threshold (px) to decide if the user is "near the bottom" of the scroll container. */
const SCROLL_THRESHOLD = 80;

function TypingIndicator() {
  return (
    <div className="flex w-full justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-neutral-800/50 px-4 py-3">
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-amber-400/70 [animation-delay:0ms]" />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-amber-400/70 [animation-delay:150ms]" />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-amber-400/70 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function MessageList({ messages, isStreaming = false, className }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /** Whether the user is near the bottom (should auto-scroll). */
  const isNearBottomRef = useRef(true);

  /** Check if the scroll container is near the bottom. */
  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  /** Scroll to the bottom if user is near it. */
  const scrollToBottomIfNeeded = useCallback(() => {
    if (!isNearBottomRef.current) return;
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  // Track user scroll position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => checkNearBottom();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [checkNearBottom]);

  // Auto-scroll when messages change (new message added or streaming content updates)
  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [messages, scrollToBottomIfNeeded]);

  // Also auto-scroll when streaming starts (so typing indicator is visible)
  useEffect(() => {
    if (isStreaming) {
      scrollToBottomIfNeeded();
    }
  }, [isStreaming, scrollToBottomIfNeeded]);

  // Determine if we should show the typing indicator:
  // Show it when streaming AND the last assistant message has no content yet
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const showTypingIndicator =
    isStreaming && lastMessage?.role === "assistant" && !lastMessage.content;

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center",
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-neutral-200">
          What are you hearing?
        </h3>
        <p className="max-w-sm text-sm text-neutral-400">
          Describe the sound in your head -- a vibe, a feeling, a genre, a
          melody. I will help you bring it to life.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4",
        className,
      )}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {showTypingIndicator && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
