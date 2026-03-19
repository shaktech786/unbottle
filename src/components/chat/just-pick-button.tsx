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
        "rounded-xl border-2 border-dashed border-indigo-500/40 px-5 py-2.5",
        "text-sm font-semibold text-indigo-300 transition-all",
        "hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-200",
        "active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      Just pick for me
    </button>
  );
}
