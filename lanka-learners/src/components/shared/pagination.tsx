import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Server-rendered pagination. Filters are preserved by rebuilding the query
 * string, so paging never loses the user's search.
 */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const buildHref = (targetPage: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "" && key !== "page") {
        query.set(key, value);
      }
    }
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row print:hidden">
      <p className="text-xs text-muted-foreground">
        Showing <span className="tabular font-medium">{first}</span>–
        <span className="tabular font-medium">{last}</span> of{" "}
        <span className="tabular font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          render={page <= 1 ? undefined : <Link href={buildHref(page - 1)} />}
        >
          Previous
        </Button>

        <span className="text-xs text-muted-foreground">
          Page <span className="tabular font-medium">{page}</span> of{" "}
          <span className="tabular font-medium">{totalPages}</span>
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          render={
            page >= totalPages ? undefined : <Link href={buildHref(page + 1)} />
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}
