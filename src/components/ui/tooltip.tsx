import { cn } from "@/lib/utils/cn";

export type TooltipProps = {
  content: string;
  children: React.ReactNode;
  className?: string;
};

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span title={content} className={cn("relative", className)}>
      {children}
    </span>
  );
}
