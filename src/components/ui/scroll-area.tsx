import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type ScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
  maxHeight?: string;
};

export function ScrollArea({
  maxHeight = "100%",
  className,
  style,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      className={cn(
        "overflow-y-auto",
        "[&::-webkit-scrollbar]:w-1.5",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700",
        "[&::-webkit-scrollbar-thumb]:hover:bg-slate-600",
        className,
      )}
      style={{ maxHeight, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
