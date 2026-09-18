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
import { trialCreateSchema } from "@/lib/validations/operations";

type FormValues = {
  clientId: string;
  trialDate: string;
  dmtBarcode?: string;
};

type ExistingTrial = {
  id: string;
  clientId: string;
  clientLabel: string;
  trialDate: Date | string;
  dmtBarcode: string | null;
};

export function TrialDialog({
  clients,
  trial,
  defaultClientId,
  fixedClientLabel,
  compact,
}: {
  clients?: ClientOption[];
  trial?: ExistingTrial;
  defaultClientId?: string;
  /** Locks the client (e.g. when opened from a client profile). */
  fixedClientLabel?: string;
  /** Smaller trigger button for use inside cards. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(trial);
  const lockedClientLabel = trial?.clientLabel ?? fixedClientLabel;

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
        }
      : {
          clientId: defaultClientId ?? "",
          trialDate: new Date().toISOString().slice(0, 10),
          dmtBarcode: "",
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
            <Button size={compact ? "xs" : "default"}>
              <PlusIcon className={compact ? "size-3" : "size-4"} />
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
              ? "Correct the trial date or DMT barcode. Use Add Results for the result."
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
            {lockedClientLabel ? (
              <Input value={lockedClientLabel} readOnly className="bg-muted" />
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

            {/* The DMT barcode is only kept for corrections to older records. */}
            {isEdit ? (
              <Field
                label="DMT Barcode"
                htmlFor="dmtBarcode"
                error={errors.dmtBarcode?.message}
              >
                <Input id="dmtBarcode" {...register("dmtBarcode")} />
              </Field>
            ) : null}

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
