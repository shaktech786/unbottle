import { cn } from "@/lib/utils/cn";

export type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-800",
        className,
      )}
    />
  );
}
