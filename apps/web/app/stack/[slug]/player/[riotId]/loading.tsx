import { Skeleton } from "@/components/kit/Frame";

/** Skeleton for a stack member's page so clicking a player shows instant feedback. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="notch flex items-center gap-4 border border-line/60 bg-bg/60 p-5 backdrop-blur-md">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="col-span-2 h-48 lg:row-span-2" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
