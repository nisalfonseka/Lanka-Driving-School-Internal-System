import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholders shaped like the real pages, shown instantly by each
 * route's `loading.tsx` while the server streams the data in.
 */

function HeaderSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl bg-card p-5 ring-1 ring-foreground/[0.07]"
        >
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TablePageSkeleton({
  columns = 6,
  rows = 8,
  filters = 4,
  stats = false,
}: {
  columns?: number;
  rows?: number;
  filters?: number;
  stats?: boolean;
}) {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton />
      {stats ? <StatRowSkeleton /> : null}

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {filters > 0 ? (
          <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: filters }, (_, index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex gap-4 border-b bg-muted/40 px-4 py-3">
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton key={index} className="h-3 flex-1" />
          ))}
        </div>

        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
            {Array.from({ length: columns }, (_, column) => (
              <Skeleton
                key={column}
                className="h-3.5 flex-1"
                style={{ opacity: 1 - row * 0.08 }}
              />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ChartsPageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton />
      <Skeleton className="mb-6 h-14 w-full rounded-xl" />
      <StatRowSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 ${index === 0 ? "lg:col-span-2" : ""}`}
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" role="status" aria-label="Loading">
      <div className="flex items-center gap-6 rounded-xl bg-card p-7 ring-1 ring-foreground/10">
        <Skeleton className="size-20 rounded-2xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-6 w-56 max-w-full" />
        </div>
      </div>
      <div className="flex gap-3 border-b pb-2">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-20" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl" role="status" aria-label="Loading">
      <HeaderSkeleton />
      <div className="space-y-6">
        {[0, 1, 2].map((card) => (
          <div
            key={card}
            className="space-y-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10"
          >
            <Skeleton className="h-4 w-48" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((field) => (
                <div key={field} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
