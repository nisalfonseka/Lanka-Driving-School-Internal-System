"use client";

import { ClipboardCheckIcon, LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateExamResultAction } from "@/actions/exams";
import { updateLectureResultAction } from "@/actions/lectures";
import { updateTrialResultAction } from "@/actions/trials";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

const EXAM_RESULTS = [
  { value: "PENDING", label: "Pending" },
  { value: "PASS", label: "Pass" },
  { value: "FAIL", label: "Fail" },
  { value: "ABSENT", label: "Absent" },
  { value: "CANCELLED", label: "Cancelled" },
];

const LECTURE_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "CANCELLED", label: "Cancelled" },
];

type Props =
  | { kind: "exam"; id: string; clientName: string; date: Date | string; status: string }
  | {
      kind: "trial";
      id: string;
      clientName: string;
      date: Date | string;
      status: string;
      notes: string | null;
      /** Vehicle class the trial was sat for, when known. */
      classLabel: string | null;
    }
  | { kind: "lecture"; id: string; clientName: string; date: Date | string; status: string };

const TITLES: Record<Props["kind"], string> = {
  exam: "Written exam result",
  trial: "Practical trial result",
  lecture: "Lecture attendance",
};

/**
 * "Add Results" — lets any signed-in user (including employees) record the
 * outcome of an existing record. Only the status/result can change here; the
 * date, client and other details stay locked. (Practical training records each
 * class separately, so it has its own Class Status dialog.)
 */
export function AddResultDialog(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState(props.status);
  const [notes, setNotes] = useState(
    props.kind === "trial" ? (props.notes ?? "") : ""
  );

  const hasNotes = props.kind === "trial";
  const options = props.kind === "lecture" ? LECTURE_STATUSES : EXAM_RESULTS;

  function resetForm() {
    setStatus(props.status);
    setNotes(props.kind === "trial" ? (props.notes ?? "") : "");
  }

  async function submit() {
    setPending(true);
    try {
      const result =
        props.kind === "exam"
          ? await updateExamResultAction({ id: props.id, result: status })
          : props.kind === "trial"
            ? await updateTrialResultAction({
                id: props.id,
                result: status,
                resultNotes: notes,
              })
            : await updateLectureResultAction({ id: props.id, status });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Result saved");
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
            Add Results
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLES[props.kind]}</DialogTitle>
          <DialogDescription>
            {props.clientName}
            {props.kind === "trial" && props.classLabel
              ? ` · ${props.classLabel}`
              : ""}{" "}
            · {formatDate(props.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field
            label={props.kind === "exam" || props.kind === "trial" ? "Result" : "Status"}
            required
          >
            <SelectField
              value={status}
              onValueChange={setStatus}
              options={options}
            />
          </Field>

          {hasNotes ? (
            <Field label="Notes" htmlFor={`result-notes-${props.id}`}>
              <Textarea
                id={`result-notes-${props.id}`}
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          ) : null}
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
              "Save Result"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
