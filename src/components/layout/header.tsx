"use client";

import { cn } from "@/lib/utils/cn";

interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Header({ title, children, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b border-neutral-800/50 bg-neutral-950 px-4 sm:px-6",
        className,
      )}
    >
      {title && (
        <h1 className="text-lg font-semibold text-neutral-100">{title}</h1>
      )}
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}
