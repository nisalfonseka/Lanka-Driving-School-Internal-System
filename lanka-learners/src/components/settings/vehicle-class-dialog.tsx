"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createVehicleClassAction,
  updateVehicleClassAction,
} from "@/actions/settings";
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
import {
  vehicleClassCreateSchema,
  vehicleClassUpdateSchema,
} from "@/lib/validations/admin";

type FormValues = {
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
};

export function VehicleClassDialog({
  vehicleClass,
}: {
  vehicleClass?: {
    id: string;
    code: string;
    name: string;
    status: "ACTIVE" | "INACTIVE";
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(vehicleClass);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(
      isEdit
        ? vehicleClassUpdateSchema.omit({ id: true })
        : vehicleClassCreateSchema.extend(
            vehicleClassUpdateSchema.pick({ status: true }).shape
          )
    ),
    defaultValues: vehicleClass
      ? {
          code: vehicleClass.code,
          name: vehicleClass.name,
          status: vehicleClass.status,
        }
      : { code: "", name: "", status: "ACTIVE" },
  });

  async function onSubmit(values: FormValues) {
    const result = isEdit
      ? await updateVehicleClassAction({ ...values, id: vehicleClass!.id })
      : await createVehicleClassAction({
          code: values.code,
          name: values.name,
        });

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

    toast.success(isEdit ? "Vehicle class updated" : "Vehicle class added");
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
            <Button size="sm">
              <PlusIcon className="size-4" />
              Add Vehicle Class
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Vehicle Class" : "Add Vehicle Class"}
          </DialogTitle>
          <DialogDescription>
            Deactivated classes stay on existing records but cannot be selected
            on new ones.
          </DialogDescription>
        </DialogHeader>

        <form
          id="vehicle-class-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Field
            label="Code"
            htmlFor="code"
            required
            error={errors.code?.message}
            hint="For example A, B1, B AUTO."
          >
            <Input
              id="code"
              aria-invalid={Boolean(errors.code)}
              {...register("code")}
            />
          </Field>

          <Field
            label="Name"
            htmlFor="name"
            required
            error={errors.name?.message}
          >
            <Input
              id="name"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>

          {isEdit ? (
            <Field label="Status" required error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: "ACTIVE", label: "Active" },
                      { value: "INACTIVE", label: "Inactive" },
                    ]}
                  />
                )}
              />
            </Field>
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
          <Button
            type="submit"
            form="vehicle-class-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Class"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
