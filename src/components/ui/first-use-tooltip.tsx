"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { TooltipKey } from "@/lib/hooks/use-first-use-tooltip";
import { useFirstUseTooltip } from "@/lib/hooks/use-first-use-tooltip";

export interface FirstUseTooltipProps {
  tooltipKey: TooltipKey;
  text: string;
  children: ReactNode;
  className?: string;
  /** Where to render the tooltip bubble relative to the child. Default: "top" */
  position?: "top" | "bottom" | "left" | "right";
}

const POSITION_CLASSES: Record<
  NonNullable<FirstUseTooltipProps["position"]>,
  { bubble: string; arrow: string }
> = {
  top: {
    bubble: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    arrow:
      "absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-500",
  },
  bottom: {
    bubble: "top-full mt-2 left-1/2 -translate-x-1/2",
    arrow:
      "absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-amber-500",
  },
  left: {
    bubble: "right-full mr-2 top-1/2 -translate-y-1/2",
    arrow:
      "absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-amber-500",
  },
  right: {
    bubble: "left-full ml-2 top-1/2 -translate-y-1/2",
    arrow:
      "absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-amber-500",
  },
};

export function FirstUseTooltip({
  tooltipKey,
  text,
  children,
  className,
  position = "top",
}: FirstUseTooltipProps) {
  const { show, dismiss } = useFirstUseTooltip(tooltipKey);
  const pos = POSITION_CLASSES[position];

  return (
    <span className={cn("relative inline-flex", className)}>
      {children}

      {show && (
        <span
          className={cn(
            "absolute z-50 w-56 rounded-xl border border-amber-500/40 bg-neutral-900 px-3 py-2 shadow-lg shadow-black/40",
            pos.bubble,
          )}
          role="tooltip"
        >
          <span className={pos.arrow} aria-hidden="true" />

          <span className="flex items-start gap-2">
            <span className="flex-1 text-xs leading-snug text-neutral-200">
              {text}
            </span>
            <button
              type="button"
              onClick={dismiss}
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
          </span>
        </span>
      )}
    </span>
  );
}
