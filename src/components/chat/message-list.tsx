"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import type { ChatMessage } from "@/lib/music/types";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: ChatMessage[];
  className?: string;
}

export function MessageList({ messages, className }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <div ref={bottomRef} />
    </div>
  );
}
