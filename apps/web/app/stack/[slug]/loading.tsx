import { Skeleton } from "@/components/kit/Frame";

/** Skeleton for the stack dashboard so navigation/queue-tab switches never feel frozen. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* header */}
      <div className="notch flex flex-wrap items-center gap-4 border border-line/60 bg-bg/60 p-5 backdrop-blur-md">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* leaderboard */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-44" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        {/* awards / side */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
