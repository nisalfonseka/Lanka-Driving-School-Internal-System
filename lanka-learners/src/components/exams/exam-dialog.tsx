"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createExamAction, updateExamAction } from "@/actions/exams";
import { ClientPicker, type ClientOption } from "@/components/forms/client-picker";
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
import { examCreateSchema } from "@/lib/validations/operations";

const ATTENDANCE_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
];

const RESULT_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "PASS", label: "Pass" },
  { value: "FAIL", label: "Fail" },
  { value: "ABSENT", label: "Absent" },
];

type FormValues = {
  clientId: string;
  examDate: string;
  dmtBarcode?: string;
  attendance: "PRESENT" | "ABSENT";
  result: "PASS" | "FAIL" | "ABSENT" | "PENDING";
};

type ExistingExam = {
  id: string;
  clientId: string;
  clientLabel: string;
  examDate: Date | string;
  dmtBarcode: string | null;
  attendance: "PRESENT" | "ABSENT";
  result: "PASS" | "FAIL" | "ABSENT" | "PENDING";
};

export function ExamDialog({
  clients,
  exam,
  defaultClientId,
}: {
  clients?: ClientOption[];
  /** Present for edit mode. Only owners are given this. */
  exam?: ExistingExam;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(exam);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(examCreateSchema),
    defaultValues: exam
      ? {
          clientId: exam.clientId,
          examDate: toDateInputValue(exam.examDate),
          dmtBarcode: exam.dmtBarcode ?? "",
          attendance: exam.attendance,
          result: exam.result,
        }
      : {
          clientId: defaultClientId ?? "",
          examDate: new Date().toISOString().slice(0, 10),
          dmtBarcode: "",
          attendance: "PRESENT",
          result: "PENDING",
        },
  });

  async function onSubmit(values: FormValues) {
    const result = isEdit
      ? await updateExamAction({ ...values, id: exam!.id })
      : await createExamAction(values);

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

    toast.success(isEdit ? "Exam record updated" : "Exam record added");
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
              Add Exam
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Correct Written Exam" : "Add Written Exam"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the recorded attendance and result."
              : "Record a written exam sitting. A client may have multiple attempts."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="exam-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Field label="Client" required error={errors.clientId?.message}>
            {isEdit ? (
              // The client is fixed on a correction — only the exam data changes.
              <Input value={exam!.clientLabel} readOnly className="bg-muted" />
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
              label="Exam Date"
              htmlFor="examDate"
              required
              error={errors.examDate?.message}
            >
              <Input
                id="examDate"
                type="date"
                aria-invalid={Boolean(errors.examDate)}
                {...register("examDate")}
              />
            </Field>

            <Field
              label="DMT Barcode"
              htmlFor="dmtBarcode"
              error={errors.dmtBarcode?.message}
            >
              <Input id="dmtBarcode" {...register("dmtBarcode")} />
            </Field>

            <Field label="Attendance" required error={errors.attendance?.message}>
              <Controller
                control={control}
                name="attendance"
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={ATTENDANCE_OPTIONS}
                  />
                )}
              />
            </Field>

            <Field label="Result" required error={errors.result?.message}>
              <Controller
                control={control}
                name="result"
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={RESULT_OPTIONS}
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
          <Button type="submit" form="exam-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Exam"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
