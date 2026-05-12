"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

interface AlmostDoneToggleProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
}

export function AlmostDoneToggle({
  active,
  onToggle,
  className,
}: AlmostDoneToggleProps) {
  return (
    <Tooltip
      content={
        active
          ? "Almost Done mode active — arrangement locked, polish only. Click to exit."
          : "Enter Almost Done mode — lock arrangement and focus on mixing & effects."
      }
    >
      <Button
        size="sm"
        variant={active ? "primary" : "ghost"}
        onClick={onToggle}
        className={cn(
          "gap-1.5 transition-all",
          active && "ring-2 ring-amber-500/40",
          className,
        )}
        aria-pressed={active}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            active ? "bg-amber-300 animate-pulse" : "bg-neutral-500",
          )}
        />
        {active ? "Almost Done" : "Almost Done"}
      </Button>
    </Tooltip>
  );
}
