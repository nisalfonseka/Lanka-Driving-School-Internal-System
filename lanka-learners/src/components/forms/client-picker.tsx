"use client";

import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ClientOption = {
  id: string;
  fullName: string;
  admissionNumber: string;
  idNumber: string;
};

/**
 * Searchable client selector. Filtering happens in the browser over a bounded
 * list, which keeps data entry fast without shipping the whole client table.
 */
export function ClientPicker({
  clients,
  value,
  onChange,
  invalid,
  disabled,
}: {
  clients: ClientOption[];
  value: string | undefined;
  onChange: (clientId: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = clients.find((client) => client.id === value);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients.slice(0, 60);
    return clients
      .filter(
        (client) =>
          client.fullName.toLowerCase().includes(needle) ||
          client.admissionNumber.toLowerCase().includes(needle) ||
          client.idNumber.toLowerCase().includes(needle)
      )
      .slice(0, 60);
  }, [clients, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected
                ? `${selected.fullName} · ${selected.admissionNumber}`
                : "Select a client…"}
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />

      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, NIC or admission no…"
            className="h-9 border-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matching clients
            </p>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  onChange(client.id);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  client.id === value && "bg-accent text-accent-foreground"
                )}
              >
                <CheckIcon
                  className={cn(
                    "size-4 shrink-0",
                    client.id === value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {client.fullName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {client.admissionNumber} · {client.idNumber}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
