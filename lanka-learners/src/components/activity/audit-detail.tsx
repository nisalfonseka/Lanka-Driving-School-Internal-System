"use client";

import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  buildChangeRows,
  describeAction,
  describeDevice,
  describeEntity,
} from "@/lib/audit-format";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: Date | string;
  userName: string;
  ipAddress: string | null;
  userAgent: string | null;
  oldData: unknown;
  newData: unknown;
};

export function AuditDetailDialog({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);

  const rows = buildChangeRows(entry.oldData, entry.newData);
  const isComparison = entry.oldData !== null && entry.newData !== null;
  // For a correction, list what changed first, then the untouched fields.
  const sorted = isComparison
    ? [...rows.filter((row) => row.changed), ...rows.filter((row) => !row.changed)]
    : rows;
  const changedCount = rows.filter((row) => row.changed).length;
  const device = describeDevice(entry.userAgent);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="xs">
            Details
          </Button>
        }
      />

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{describeAction(entry.action)}</DialogTitle>
          <DialogDescription>{entry.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/40 p-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Done by</dt>
              <dd className="font-medium">{entry.userName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">When</dt>
              <dd>{formatDateTime(entry.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Record</dt>
              <dd>{describeEntity(entry.entityType)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Device</dt>
              <dd>{device ?? "—"}</dd>
            </div>
          </dl>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No further details were recorded for this action.
            </p>
          ) : isComparison ? (
            <div>
              <p className="mb-2 text-sm font-medium">
                {changedCount === 0
                  ? "Saved without any changes"
                  : `${changedCount} ${changedCount === 1 ? "change" : "changes"}`}
              </p>
              <ul className="divide-y rounded-lg border">
                {sorted.map((row) => (
                  <li
                    key={row.key}
                    className={cn(
                      "grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3",
                      row.changed && "bg-amber-50 dark:bg-amber-500/10"
                    )}
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    {row.changed ? (
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-muted-foreground line-through decoration-muted-foreground/60">
                          {row.before}
                        </span>
                        <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{row.after}</span>
                      </span>
                    ) : (
                      <span className="break-words">{row.after}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium">Details recorded</p>
              <ul className="divide-y rounded-lg border">
                {rows.map((row) => (
                  <li
                    key={row.key}
                    className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="break-words">
                      {entry.newData !== null ? row.after : row.before}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
