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
import { Input } from "@/components/ui/input";
import { toDateInputValue } from "@/lib/format";
import { lectureCreateSchema } from "@/lib/validations/operations";

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
];

type FormValues = {
  clientId: string;
  attendanceDate: string;
  status: "PRESENT" | "ABSENT";
};

type ExistingLecture = {
  id: string;
  clientId: string;
  clientLabel: string;
  attendanceDate: Date | string;
  status: "PRESENT" | "ABSENT";
};

export function LectureDialog({
  clients,
  lecture,
  defaultClientId,
}: {
  clients?: ClientOption[];
  lecture?: ExistingLecture;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(lecture);

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
          status: lecture.status,
        }
      : {
          clientId: defaultClientId ?? "",
          attendanceDate: new Date().toISOString().slice(0, 10),
          status: "PRESENT",
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
            <Button>
              <PlusIcon className="size-4" />
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
            {isEdit ? (
              <Input
                value={lecture!.clientLabel}
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

            <Field label="Status" required error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={STATUS_OPTIONS}
                  />
                )}
              />
            </Field>
          </div>
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
