"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createPaymentAction, updatePaymentAction } from "@/actions/payments";
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
import { paymentCreateSchema } from "@/lib/validations/operations";

import type { z } from "zod";

const TYPE_OPTIONS = [
  { value: "ADVANCE", label: "Advance" },
  { value: "INSTALLMENT", label: "Installment" },
  { value: "TRAINING_FEE", label: "Training Fee" },
  { value: "OTHER", label: "Other" },
];

/**
 * Derived from the Zod schema rather than hand-written: `amount` arrives from
 * the input as a string and is coerced, so the form's input and output types
 * genuinely differ.
 */
type FormInput = z.input<typeof paymentCreateSchema>;
type FormValues = z.output<typeof paymentCreateSchema>;

type ExistingPayment = {
  id: string;
  clientId: string;
  clientLabel: string;
  paymentDate: Date | string;
  billNumber: string;
  amount: number;
  paymentType: "ADVANCE" | "INSTALLMENT" | "TRAINING_FEE" | "OTHER";
  description: string | null;
};

export function PaymentDialog({
  clients,
  payment,
  defaultClientId,
}: {
  clients?: ClientOption[];
  payment?: ExistingPayment;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(payment);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(paymentCreateSchema),
    defaultValues: payment
      ? {
          clientId: payment.clientId,
          paymentDate: toDateInputValue(payment.paymentDate),
          billNumber: payment.billNumber,
          amount: payment.amount,
          paymentType: payment.paymentType,
          description: payment.description ?? "",
        }
      : {
          clientId: defaultClientId ?? "",
          paymentDate: new Date().toISOString().slice(0, 10),
          billNumber: "",
          amount: undefined,
          paymentType: "INSTALLMENT",
          description: "",
        },
  });

  async function onSubmit(values: FormValues) {
    const result = isEdit
      ? await updatePaymentAction({ ...values, id: payment!.id })
      : await createPaymentAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof FormInput, {
            type: "server",
            message: messages[0],
          });
        }
      }
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Payment updated" : "Payment recorded");
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
              Add Payment
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Correct Payment" : "Add Payment"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Financial corrections are recorded in the activity log."
              : "Record a client payment. Bill numbers must be unique."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="payment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Field label="Client" required error={errors.clientId?.message}>
            {isEdit ? (
              <Input
                value={payment!.clientLabel}
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
              label="Payment Date"
              htmlFor="paymentDate"
              required
              error={errors.paymentDate?.message}
            >
              <Input
                id="paymentDate"
                type="date"
                aria-invalid={Boolean(errors.paymentDate)}
                {...register("paymentDate")}
              />
            </Field>

            <Field
              label="Bill Number"
              htmlFor="billNumber"
              required
              error={errors.billNumber?.message}
            >
              <Input
                id="billNumber"
                aria-invalid={Boolean(errors.billNumber)}
                {...register("billNumber")}
              />
            </Field>

            <Field
              label="Amount"
              htmlFor="amount"
              required
              error={errors.amount?.message}
              hint="In LKR"
            >
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="tabular"
                aria-invalid={Boolean(errors.amount)}
                {...register("amount")}
              />
            </Field>

            <Field
              label="Payment Type"
              required
              error={errors.paymentType?.message}
            >
              <Controller
                control={control}
                name="paymentType"
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={TYPE_OPTIONS}
                  />
                )}
              />
            </Field>
          </div>

          <Field
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
          >
            <Textarea id="description" rows={2} {...register("description")} />
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
          <Button type="submit" form="payment-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
