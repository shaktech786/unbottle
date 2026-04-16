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
 * fenced code blocks (```...```), and paragraph / line breaks.
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
        ...formatParagraphs(text.slice(lastIndex, match.index), nodes.length),
      );
    }
    nodes.push(
      <pre
        key={`cb-${nodes.length}`}
        className="my-2 overflow-x-auto rounded-md bg-neutral-950 p-3 text-sm text-neutral-200"
      >
        <code>{match[1]}</code>
      </pre>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(...formatParagraphs(text.slice(lastIndex), nodes.length));
  }

  return nodes;
}

/**
 * Split text on double-newlines into paragraphs, and render single
 * newlines as <br /> within each paragraph. This ensures AI responses
 * display with proper spacing even if whitespace-pre-wrap is not enough.
 */
function formatParagraphs(text: string, keyOffset: number): React.ReactNode[] {
  const paragraphs = text.split(/\n{2,}/);
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    if (!para) continue;

    // Within a paragraph, split on single newlines and insert <br />
    const lines = para.split("\n");
    const paraChildren: React.ReactNode[] = [];
    for (let j = 0; j < lines.length; j++) {
      if (j > 0) {
        paraChildren.push(<br key={`br-${keyOffset}-${i}-${j}`} />);
      }
      paraChildren.push(...formatInline(lines[j], keyOffset + i * 100 + j));
    }

    nodes.push(
      <p key={`p-${keyOffset}-${i}`} className="mb-2 last:mb-0">
        {paraChildren}
      </p>,
    );
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
          className="rounded bg-neutral-950 px-1.5 py-0.5 font-mono text-sm text-amber-300"
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
            ? "rounded-br-md bg-amber-600/20 text-neutral-100"
            : "rounded-bl-md bg-neutral-800/50 text-neutral-200",
        )}
      >
        {isEmpty ? (
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
        ) : (
          <div className="break-words text-sm leading-relaxed">
            {formatContent(message.content)}
          </div>
        )}
        <div
          className={cn(
            "mt-1.5 font-mono text-xs",
            isUser ? "text-amber-400/50" : "text-neutral-600",
          )}
        >
          {formatTimestamp(message.createdAt)}
        </div>
      </div>
    </div>
  );
}
