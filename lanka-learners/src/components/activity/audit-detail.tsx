"use client";

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
import { formatDateTime, humanise } from "@/lib/format";

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  createdAt: Date | string;
  userName: string;
  ipAddress: string | null;
  userAgent: string | null;
  oldData: unknown;
  newData: unknown;
};

function DataBlock({ title, data }: { title: string; data: unknown }) {
  if (data === null || data === undefined) return null;

  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export function AuditDetailDialog({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetail = entry.oldData !== null || entry.newData !== null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="xs">
            Details
          </Button>
        }
      />

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{humanise(entry.action)}</DialogTitle>
          <DialogDescription>{entry.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground uppercase">User</dt>
              <dd>{entry.userName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">When</dt>
              <dd>{formatDateTime(entry.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                Entity
              </dt>
              <dd className="truncate">
                {entry.entityType}
                {entry.entityId ? ` · ${entry.entityId}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                IP Address
              </dt>
              <dd className="tabular">{entry.ipAddress ?? "—"}</dd>
            </div>
          </dl>

          {entry.userAgent ? (
            <div>
              <p className="text-xs text-muted-foreground uppercase">Device</p>
              <p className="text-xs break-words text-muted-foreground">
                {entry.userAgent}
              </p>
            </div>
          ) : null}

          {hasDetail ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <DataBlock title="Before" data={entry.oldData} />
              <DataBlock title="After" data={entry.newData} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No field-level changes were recorded for this action.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
