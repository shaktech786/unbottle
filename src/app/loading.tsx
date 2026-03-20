import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      {/* Simulated hero skeleton */}
      <div className="flex w-full max-w-2xl flex-col items-center gap-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-2 h-5 w-2/3" />
        <Skeleton className="mt-4 h-12 w-40 rounded-lg" />
      </div>

      {/* Simulated cards skeleton */}
      <div className="mt-8 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6"
          >
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
