"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils/cn";
import { useFirstUseTooltip } from "@/lib/hooks/use-first-use-tooltip";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ onSend, disabled = false, className }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { show: showTip, dismiss: dismissTip } = useFirstUseTooltip("chat");

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  return (
    <div className={cn("border-t border-neutral-800/50 bg-neutral-950 px-4 py-3", className)}>
      {showTip && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-neutral-900 px-3 py-2">
          <span className="flex-1 text-xs leading-snug text-neutral-200">
            Type your idea here — the AI will shape it into an arrangement
          </span>
          <button
            type="button"
            onClick={dismissTip}
            aria-label="Dismiss tip"
            className="mt-0.5 shrink-0 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Describe what you're hearing in your head..."
          className={cn(
            "w-full resize-none rounded-xl border bg-neutral-900 px-4 py-3 text-sm text-neutral-50",
            "border-neutral-700 placeholder:text-neutral-500",
            "focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-300",
            "max-h-40",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-700",
            "[&::-webkit-scrollbar-thumb]:hover:bg-neutral-500",
          )}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            "bg-amber-500 text-white transition-colors duration-300",
            "hover:bg-amber-400",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
