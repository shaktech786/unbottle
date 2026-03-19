import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type CardVariant = "default" | "interactive";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  default: "border-slate-800",
  interactive:
    "border-slate-800 cursor-pointer transition-all hover:border-slate-600 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-indigo-500/5",
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
        "rounded-xl border bg-slate-900/50 p-6",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
