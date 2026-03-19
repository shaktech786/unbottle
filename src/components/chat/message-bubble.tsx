"use client";

import { cn } from "@/lib/utils/cn";
import type { ChatMessage } from "@/lib/music/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Minimal markdown-ish formatting: bold (**text**), inline code (`code`),
 * and fenced code blocks (```...```).
 */
function formatContent(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on fenced code blocks first
  const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        ...formatInline(text.slice(lastIndex, match.index), nodes.length),
      );
    }
    nodes.push(
      <pre
        key={`cb-${nodes.length}`}
        className="my-2 overflow-x-auto rounded-md bg-slate-950 p-3 text-sm text-slate-200"
      >
        <code>{match[1]}</code>
      </pre>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(...formatInline(text.slice(lastIndex), nodes.length));
  }

  return nodes;
}

function formatInline(text: string, keyOffset: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Handle bold (**text**) and inline code (`code`)
  const inlineRegex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // Bold
      nodes.push(
        <strong key={`b-${keyOffset}-${nodes.length}`} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      // Inline code
      nodes.push(
        <code
          key={`ic-${keyOffset}-${nodes.length}`}
          className="rounded bg-slate-950 px-1.5 py-0.5 text-sm text-indigo-300"
        >
          {match[3]}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isEmpty = !message.content;

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isUser
            ? "rounded-br-md bg-indigo-600 text-white"
            : "rounded-bl-md bg-slate-800 text-slate-200",
        )}
      >
        {isEmpty ? (
          <span className="inline-block h-5 w-5 animate-pulse rounded-full bg-slate-600" />
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {formatContent(message.content)}
          </div>
        )}
        <div
          className={cn(
            "mt-1.5 text-xs",
            isUser ? "text-indigo-200" : "text-slate-500",
          )}
        >
          {formatTimestamp(message.createdAt)}
        </div>
      </div>
    </div>
  );
}
