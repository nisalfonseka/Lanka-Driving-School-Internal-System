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
import {
  VehicleClassPicker,
  type VehicleClassOption,
} from "@/components/forms/vehicle-class-picker";
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
import {
  trialCreateSchema,
  trialEditFormSchema,
} from "@/lib/validations/operations";

type FormValues = {
  clientId: string;
  trialDate: string;
  dmtBarcode?: string;
  /** Any number of classes when adding; exactly one when correcting a trial. */
  vehicleClassIds: string[];
};

type ExistingTrial = {
  id: string;
  clientId: string;
  clientLabel: string;
  trialDate: Date | string;
  dmtBarcode: string | null;
  /** Null for trials recorded before classes were tracked. */
  vehicleClass: VehicleClassOption | null;
};

export function TrialDialog({
  clients,
  vehicleClasses,
  trial,
  defaultClientId,
  fixedClientLabel,
  compact,
}: {
  clients?: ClientOption[];
  vehicleClasses: VehicleClassOption[];
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

  // A trial may keep a class that has since been deactivated, so keep it
  // selectable when correcting that trial.
  const currentClass = trial?.vehicleClass ?? null;
  const editableClasses =
    currentClass && !vehicleClasses.some((option) => option.id === currentClass.id)
      ? [...vehicleClasses, currentClass]
      : vehicleClasses;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? trialEditFormSchema : trialCreateSchema),
    defaultValues: trial
      ? {
          clientId: trial.clientId,
          trialDate: toDateInputValue(trial.trialDate),
          dmtBarcode: trial.dmtBarcode ?? "",
          vehicleClassIds: trial.vehicleClass ? [trial.vehicleClass.id] : [],
        }
      : {
          clientId: defaultClientId ?? "",
          trialDate: new Date().toISOString().slice(0, 10),
          dmtBarcode: "",
          vehicleClassIds: [],
        },
  });

  async function onSubmit(values: FormValues) {
    const result = isEdit
      ? await updateTrialAction({
          id: trial!.id,
          clientId: values.clientId,
          trialDate: values.trialDate,
          dmtBarcode: values.dmtBarcode,
          vehicleClassId: values.vehicleClassIds[0],
        })
      : await createTrialAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(
            (field === "vehicleClassId"
              ? "vehicleClassIds"
              : field) as keyof FormValues,
            { type: "server", message: messages[0] }
          );
        }
      }
      toast.error(result.error);
      return;
    }

    const added = "ids" in result.data ? result.data.ids.length : 1;
    toast.success(
      isEdit
        ? "Trial record updated"
        : added > 1
          ? `${added} trials added — one per class`
          : "Trial record added"
    );
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
              ? "Correct the trial date, class or DMT barcode. Use Add Results for the result."
              : "Record a practical trial. Pick every class that was sat — each class is recorded on its own, with its own result."}
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

          <Field
            label={isEdit ? "Vehicle Class" : "Vehicle Classes"}
            required
            error={errors.vehicleClassIds?.message}
          >
            <Controller
              control={control}
              name="vehicleClassIds"
              render={({ field }) =>
                isEdit ? (
                  <SelectField
                    value={field.value[0]}
                    onValueChange={(next) => field.onChange([next])}
                    invalid={Boolean(errors.vehicleClassIds)}
                    placeholder="Select a class…"
                    options={editableClasses.map((option) => ({
                      value: option.id,
                      label: `${option.code} — ${option.name}`,
                    }))}
                  />
                ) : (
                  <VehicleClassPicker
                    options={vehicleClasses}
                    selected={field.value ?? []}
                    onChange={field.onChange}
                    idPrefix="new-trial"
                  />
                )
              }
            />
          </Field>

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
