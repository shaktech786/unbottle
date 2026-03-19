import { Skeleton } from "@/components/ui/skeleton";

export default function SessionLoading() {
  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Transport bar skeleton */}
      <div className="flex h-14 items-center gap-4 border-b border-slate-800 px-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-px" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-6 w-px" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-6 w-px" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-6 w-px" />
        <Skeleton className="h-8 w-16" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel skeleton */}
        <div className="flex w-[380px] shrink-0 flex-col gap-3 border-r border-slate-800 p-4">
          <Skeleton className="h-8 w-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="ml-auto h-12 w-2/3" />
            <Skeleton className="h-16 w-3/4" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Center panels skeleton */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>

        {/* Right panel skeleton */}
        <div className="flex w-[320px] shrink-0 flex-col gap-3 border-l border-slate-800 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
