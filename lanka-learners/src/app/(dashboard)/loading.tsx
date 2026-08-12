import { Skeleton } from "@/components/ui/skeleton";

function MetricSkeleton() {
  return (
    <div className="min-h-32 rounded-xl bg-card p-5 ring-1 ring-foreground/[0.07]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-2.5 w-28" />
        </div>
        <Skeleton className="size-10 rounded-xl" />
      </div>
    </div>
  );
}

function WorkspaceCardSkeleton() {
  return (
    <div className="flex min-h-44 flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/[0.07]">
      <Skeleton className="size-11 rounded-xl" />
      <div className="mt-auto space-y-2 pt-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dashboard">
      <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/[0.07] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-3 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-52" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <MetricSkeleton key={index} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <WorkspaceCardSkeleton key={index} />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading your workspace</span>
    </div>
  );
}
