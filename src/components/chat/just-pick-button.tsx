"use client";

import { cn } from "@/lib/utils/cn";

interface JustPickButtonProps {
  context: string;
  onPick: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export function JustPickButton({
  context,
  onPick,
  disabled = false,
  className,
}: JustPickButtonProps) {
  const handleClick = () => {
    if (disabled) return;
    onPick(
      `Just pick for me. I need help deciding on: ${context}. Go with whatever you think sounds best and let's keep moving.`,
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "rounded-xl border-2 border-dashed border-amber-500/40 px-5 py-2.5",
        "text-sm font-semibold text-amber-300 transition-all duration-300",
        "hover:border-amber-400 hover:bg-amber-500/10 hover:text-amber-200",
        "active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      Just pick for me
    </button>
  );
}
