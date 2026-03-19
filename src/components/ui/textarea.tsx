"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  autoResize?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, autoResize = false, className, id, onChange, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = useCallback(() => {
      const el = internalRef.current;
      if (!el || !autoResize) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [autoResize]);

    useEffect(() => {
      resize();
    }, [resize]);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-300"
          >
            {label}
          </label>
        )}
        <textarea
          ref={(node) => {
            internalRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          id={inputId}
          className={cn(
            "min-h-[80px] w-full rounded-lg border bg-slate-900 px-3 py-2 text-sm text-slate-50",
            "border-slate-700 placeholder:text-slate-500",
            "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            autoResize && "resize-none overflow-hidden",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className,
          )}
          onChange={(e) => {
            onChange?.(e);
            resize();
          }}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
