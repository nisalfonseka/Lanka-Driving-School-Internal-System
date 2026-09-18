"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createTrainingAction,
  updateTrainingAction,
} from "@/actions/practical-training";
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
import { Textarea } from "@/components/ui/textarea";
import { toDateInputValue } from "@/lib/format";
import { trainingCreateSchema } from "@/lib/validations/operations";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ABSENT", label: "Absent" },
  { value: "CANCELLED", label: "Cancelled" },
];

type TrainingStatus = "PENDING" | "COMPLETED" | "ABSENT" | "CANCELLED";

type FormValues = {
  clientId: string;
  trainingDate: string;
  vehicleClassIds: string[];
  status: TrainingStatus;
  notes?: string;
};

type ExistingTraining = {
  id: string;
  clientId: string;
  clientLabel: string;
  trainingDate: Date | string;
  vehicleClassIds: string[];
  status: TrainingStatus;
  notes: string | null;
};

export function TrainingDialog({
  clients,
  vehicleClasses,
  training,
  defaultClientId,
  fixedClientLabel,
  compact,
}: {
  clients?: ClientOption[];
  vehicleClasses: VehicleClassOption[];
  training?: ExistingTraining;
  defaultClientId?: string;
  /** Locks the client (e.g. when opened from a client profile). */
  fixedClientLabel?: string;
  /** Smaller trigger button for use inside cards. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(training);
  const lockedClientLabel = training?.clientLabel ?? fixedClientLabel;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(trainingCreateSchema),
    defaultValues: training
      ? {
          clientId: training.clientId,
          trainingDate: toDateInputValue(training.trainingDate),
          vehicleClassIds: training.vehicleClassIds,
          status: training.status,
          notes: training.notes ?? "",
        }
      : {
          clientId: defaultClientId ?? "",
          trainingDate: new Date().toISOString().slice(0, 10),
          vehicleClassIds: [],
          status: "COMPLETED",
          notes: "",
        },
  });

  async function onSubmit(values: FormValues) {
    const result = isEdit
      ? await updateTrainingAction({ ...values, id: training!.id })
      : await createTrainingAction(values);

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

    toast.success(isEdit ? "Training record updated" : "Training recorded");
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
              Add Training
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Correct Practical Training" : "Add Practical Training"}
          </DialogTitle>
          <DialogDescription>
            A single training day may cover more than one vehicle class.
          </DialogDescription>
        </DialogHeader>

        <form
          id="training-form"
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
              label="Training Date"
              htmlFor="trainingDate"
              required
              error={errors.trainingDate?.message}
            >
              <Input
                id="trainingDate"
                type="date"
                aria-invalid={Boolean(errors.trainingDate)}
                {...register("trainingDate")}
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

          <Field
            label="Vehicle Classes"
            required
            error={errors.vehicleClassIds?.message}
          >
            <Controller
              control={control}
              name="vehicleClassIds"
              render={({ field }) => (
                <VehicleClassPicker
                  options={vehicleClasses}
                  selected={field.value ?? []}
                  onChange={field.onChange}
                  idPrefix={isEdit ? `edit-${training!.id}` : "new-training"}
                />
              )}
            />
          </Field>

          <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" rows={3} {...register("notes")} />
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
          <Button type="submit" form="training-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Training"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
