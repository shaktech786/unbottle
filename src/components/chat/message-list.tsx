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
        <div className="text-4xl">🎵</div>
        <h3 className="text-lg font-medium text-slate-200">
          What are you hearing?
        </h3>
        <p className="max-w-sm text-sm text-slate-400">
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
