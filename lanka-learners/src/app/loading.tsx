import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/25 p-6">
      <div className="w-full max-w-sm space-y-4" role="status" aria-label="Loading">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <span className="sr-only">Loading Lanka Learners</span>
      </div>
    </main>
  );
}
