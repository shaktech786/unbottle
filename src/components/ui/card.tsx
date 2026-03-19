import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type CardVariant = "default" | "interactive";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  default: "border-neutral-800",
  interactive:
    "border-neutral-800 cursor-pointer transition-all duration-300 hover:border-neutral-600 hover:bg-neutral-800/60 hover:shadow-lg hover:shadow-amber-500/5",
};

export function Card({
  variant = "default",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-neutral-900/50 p-6",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
