"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createLectureAction, updateLectureAction } from "@/actions/lectures";
import {
  ClientPicker,
  type ClientOption,
} from "@/components/forms/client-picker";
import { Field } from "@/components/forms/field";
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
import { Input } from "@/components/ui/input";
import { toDateInputValue } from "@/lib/format";
import { lectureCreateSchema } from "@/lib/validations/operations";

type FormValues = {
  clientId: string;
  attendanceDate: string;
};

type ExistingLecture = {
  id: string;
  clientId: string;
  clientLabel: string;
  attendanceDate: Date | string;
};

export function LectureDialog({
  clients,
  lecture,
  defaultClientId,
  fixedClientLabel,
  compact,
}: {
  clients?: ClientOption[];
  lecture?: ExistingLecture;
  defaultClientId?: string;
  /** Locks the client (e.g. when opened from a client profile). */
  fixedClientLabel?: string;
  /** Smaller trigger button for use inside cards. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(lecture);
  const lockedClientLabel = lecture?.clientLabel ?? fixedClientLabel;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(lectureCreateSchema),
    defaultValues: lecture
      ? {
          clientId: lecture.clientId,
          attendanceDate: toDateInputValue(lecture.attendanceDate),
        }
      : {
          clientId: defaultClientId ?? "",
          attendanceDate: new Date().toISOString().slice(0, 10),
        },
  });

  async function onSubmit(values: FormValues) {
    const result = isEdit
      ? await updateLectureAction({ ...values, id: lecture!.id })
      : await createLectureAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof FormValues, {
            type: "server",
            message: messages[0],
          });
        }
      }
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Attendance updated" : "Attendance recorded");
    setOpen(false);
    if (!isEdit) reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="outline" size="xs">
              <PencilIcon className="size-3" />
              Edit
            </Button>
          ) : (
            <Button size={compact ? "xs" : "default"}>
              <PlusIcon className={compact ? "size-3" : "size-4"} />
              Record Attendance
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Correct Lecture Attendance" : "Record Lecture Attendance"}
          </DialogTitle>
          <DialogDescription>
            One attendance record per client per day.
          </DialogDescription>
        </DialogHeader>

        <form
          id="lecture-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Field label="Client" required error={errors.clientId?.message}>
            {lockedClientLabel ? (
              <Input
                value={lockedClientLabel}
                readOnly
                className="bg-muted"
              />
            ) : (
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <ClientPicker
                    clients={clients ?? []}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={Boolean(errors.clientId)}
                  />
                )}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date"
              htmlFor="attendanceDate"
              required
              error={errors.attendanceDate?.message}
            >
              <Input
                id="attendanceDate"
                type="date"
                aria-invalid={Boolean(errors.attendanceDate)}
                {...register("attendanceDate")}
              />
            </Field>
          </div>

          {!isEdit ? (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              New records start as <span className="font-medium text-foreground">Pending</span>.
              Record the outcome later with the <span className="font-medium text-foreground">Add Results</span> button.
            </p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="lecture-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Record"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
