"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { SelectField, type SelectOption } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FilterDefinition =
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "date" }
  | { key: string; label: string; type: "select"; options: SelectOption[] };

/**
 * Shared URL-backed filter bar. Keeping filter state in the query string means
 * every list is filtered and paginated on the server.
 */
export function RecordFilters({
  basePath,
  filters,
}: {
  basePath: string;
  filters: FilterDefinition[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      filters.map((filter) => [filter.key, searchParams.get(filter.key) ?? ""])
    )
  );

  const hasFilters = Object.values(values).some((value) => value !== "");

  function set(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const query = new URLSearchParams();

    // Filters set by the page (e.g. clientId deep links) must survive a search.
    const preserved = searchParams.get("clientId");
    if (preserved && !filters.some((filter) => filter.key === "clientId")) {
      query.set("clientId", preserved);
    }

    for (const [key, value] of Object.entries(values)) {
      if (value) query.set(key, value);
    }

    const queryString = query.toString();
    router.push(queryString ? `${basePath}?${queryString}` : basePath);
  }

  function clear() {
    setValues(Object.fromEntries(filters.map((filter) => [filter.key, ""])));
    router.push(basePath);
  }

  return (
    <form
      onSubmit={apply}
      className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden"
    >
      {filters.map((filter) => (
        <div key={filter.key} className="space-y-1.5">
          <Label htmlFor={`filter-${filter.key}`} className="text-xs">
            {filter.label}
          </Label>

          {filter.type === "select" ? (
            <SelectField
              id={`filter-${filter.key}`}
              value={values[filter.key]}
              onValueChange={(value) => set(filter.key, value)}
              options={filter.options}
              placeholder={filter.options[0]?.label ?? "All"}
            />
          ) : (
            <Input
              id={`filter-${filter.key}`}
              type={filter.type === "date" ? "date" : "text"}
              placeholder={
                filter.type === "text" ? filter.placeholder : undefined
              }
              value={values[filter.key]}
              onChange={(event) => set(filter.key, event.target.value)}
            />
          )}
        </div>
      ))}

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
        <Button type="submit" size="sm">
          <SearchIcon className="size-4" />
          Search
        </Button>

        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <XIcon className="size-4" />
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}
