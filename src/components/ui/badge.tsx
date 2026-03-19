import { cn } from "@/lib/utils/cn";

export type BadgeVariant = "default" | "success" | "warning" | "info";

export type BadgeProps = {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-700 text-slate-200",
  success: "bg-emerald-900/60 text-emerald-300 border-emerald-800",
  warning: "bg-amber-900/60 text-amber-300 border-amber-800",
  info: "bg-indigo-900/60 text-indigo-300 border-indigo-800",
};

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
