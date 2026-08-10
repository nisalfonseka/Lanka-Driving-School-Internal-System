"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createTrialAction, updateTrialAction } from "@/actions/trials";
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
import { Textarea } from "@/components/ui/textarea";
import { toDateInputValue } from "@/lib/format";
import { trialCreateSchema } from "@/lib/validations/operations";

const RESULT_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "PASS", label: "Pass" },
  { value: "FAIL", label: "Fail" },
  { value: "ABSENT", label: "Absent" },
];

type FormValues = {
  clientId: string;
  trialDate: string;
  dmtBarcode?: string;
  result: "PASS" | "FAIL" | "ABSENT" | "PENDING";
  resultNotes?: string;
};

type ExistingTrial = {
  id: string;
  clientId: string;
  clientLabel: string;
  trialDate: Date | string;
  dmtBarcode: string | null;
  result: "PASS" | "FAIL" | "ABSENT" | "PENDING";
  resultNotes: string | null;
};

export function TrialDialog({
  clients,
  trial,
  defaultClientId,
}: {
  clients?: ClientOption[];
  trial?: ExistingTrial;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(trial);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(trialCreateSchema),
    defaultValues: trial
      ? {
          clientId: trial.clientId,
          trialDate: toDateInputValue(trial.trialDate),
          dmtBarcode: trial.dmtBarcode ?? "",
          result: trial.result,
          resultNotes: trial.resultNotes ?? "",
        }
      : {
          clientId: defaultClientId ?? "",
          trialDate: new Date().toISOString().slice(0, 10),
          dmtBarcode: "",
          result: "PENDING",
          resultNotes: "",
        },
  });

  async function onSubmit(values: FormValues) {
    const result = isEdit
      ? await updateTrialAction({ ...values, id: trial!.id })
      : await createTrialAction(values);

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

    toast.success(isEdit ? "Trial record updated" : "Trial record added");
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
              Add Trial
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Correct Practical Trial" : "Add Practical Trial"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the recorded trial result."
              : "Record a practical trial. A client may sit several trials."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="trial-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Field label="Client" required error={errors.clientId?.message}>
            {isEdit ? (
              <Input value={trial!.clientLabel} readOnly className="bg-muted" />
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

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Trial Date"
              htmlFor="trialDate"
              required
              error={errors.trialDate?.message}
            >
              <Input
                id="trialDate"
                type="date"
                aria-invalid={Boolean(errors.trialDate)}
                {...register("trialDate")}
              />
            </Field>

            <Field
              label="DMT Barcode"
              htmlFor="dmtBarcode"
              error={errors.dmtBarcode?.message}
            >
              <Input id="dmtBarcode" {...register("dmtBarcode")} />
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

          <Field
            label="Result Notes"
            htmlFor="resultNotes"
            error={errors.resultNotes?.message}
          >
            <Textarea id="resultNotes" rows={3} {...register("resultNotes")} />
          </Field>
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
          <Button type="submit" form="trial-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Trial"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
