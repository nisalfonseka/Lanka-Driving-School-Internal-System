"use client";

import { ClipboardCheckIcon, LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateTrainingResultAction } from "@/actions/practical-training";
import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

const STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ABSENT", label: "Absent" },
  { value: "CANCELLED", label: "Cancelled" },
];

type ClassRow = { vehicleClassId: string; code: string; status: string };

function statusesOf(classes: ClassRow[]): Record<string, string> {
  return Object.fromEntries(
    classes.map((row) => [row.vehicleClassId, row.status])
  );
}

/**
 * "Class Status" — lets any signed-in user (including employees) mark each
 * vehicle class of a training day as completed or not. The date, client and
 * classes themselves stay locked; only the status and notes can change here.
 */
export function ClassStatusDialog({
  id,
  clientName,
  date,
  notes,
  classes,
}: {
  id: string;
  clientName: string;
  date: Date | string;
  notes: string | null;
  classes: ClassRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [statuses, setStatuses] = useState(() => statusesOf(classes));
  const [note, setNote] = useState(notes ?? "");

  function resetForm() {
    setStatuses(statusesOf(classes));
    setNote(notes ?? "");
  }

  async function submit() {
    setPending(true);
    try {
      const result = await updateTrainingResultAction({
        id,
        classStatuses: classes.map((row) => ({
          vehicleClassId: row.vehicleClassId,
          status: statuses[row.vehicleClassId],
        })),
        notes: note,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Class status saved");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="secondary" size="xs">
            <ClipboardCheckIcon className="size-3" />
            Class Status
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Class status</DialogTitle>
          <DialogDescription>
            {clientName} · {formatDate(date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Mark each vehicle class as completed or not for this training day.
          </p>

          <ul className="divide-y rounded-lg border">
            {classes.map((row) => {
              const selectId = `class-status-${id}-${row.vehicleClassId}`;
              return (
                <li
                  key={row.vehicleClassId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <Label htmlFor={selectId} className="font-medium">
                    {row.code}
                  </Label>
                  <SelectField
                    id={selectId}
                    className="w-40"
                    value={statuses[row.vehicleClassId]}
                    onValueChange={(next) =>
                      setStatuses((current) => ({
                        ...current,
                        [row.vehicleClassId]: next,
                      }))
                    }
                    options={STATUSES}
                  />
                </li>
              );
            })}
          </ul>

          <Field label="Notes" htmlFor={`class-status-notes-${id}`}>
            <Textarea
              id={`class-status-notes-${id}`}
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Status"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
