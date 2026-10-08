"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2Icon,
  LoaderIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
} from "lucide-react";
import Link from "next/link";
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

const METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_DEPOSIT", label: "Bank Deposit" },
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
  paymentMethod: "CASH" | "CARD" | "BANK_DEPOSIT" | null;
  description: string | null;
};

type CreatedPayment = {
  id: string;
  billNumber: string;
  amount: number;
  paymentMethod: "CASH" | "CARD" | "BANK_DEPOSIT";
};

export function PaymentDialog({
  clients,
  payment,
  defaultClientId,
  fixedClientLabel,
  compact,
}: {
  clients?: ClientOption[];
  payment?: ExistingPayment;
  defaultClientId?: string;
  /** Locks the client (e.g. when opened from a client profile). */
  fixedClientLabel?: string;
  /** Smaller trigger button for use inside cards. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [createdPayment, setCreatedPayment] = useState<CreatedPayment | null>(
    null
  );
  const isEdit = Boolean(payment);
  const lockedClientLabel = payment?.clientLabel ?? fixedClientLabel;

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
          paymentMethod: payment.paymentMethod ?? "CASH",
          description: payment.description ?? "",
        }
      : {
          clientId: defaultClientId ?? "",
          paymentDate: new Date().toISOString().slice(0, 10),
          billNumber: "",
          amount: undefined,
          paymentType: "INSTALLMENT",
          paymentMethod: "CASH",
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

    if (isEdit) {
      toast.success("Payment updated");
      setOpen(false);
    } else {
      setCreatedPayment({
        id: result.data.id,
        billNumber: values.billNumber,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
      });
    }
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setCreatedPayment(null);
          reset();
        }
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
              Add Payment
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        {createdPayment ? (
          <>
            <div className="flex flex-col items-center px-4 py-5 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2Icon className="size-9" aria-hidden="true" />
              </div>
              <DialogHeader className="items-center">
                <DialogTitle>Payment Added Successfully</DialogTitle>
                <DialogDescription>
                  Bill {createdPayment.billNumber} has been recorded. You can
                  print the receipt now.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-semibold tabular">
                  LKR {createdPayment.amount.toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid By</p>
                <p className="font-semibold">
                  {METHOD_OPTIONS.find(
                    (option) => option.value === createdPayment.paymentMethod
                  )?.label ?? createdPayment.paymentMethod}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
              <Button
                render={
                  <Link
                    href={`/payments/${createdPayment.id}/receipt`}
                    target="_blank"
                  />
                }
              >
                <PrinterIcon className="size-4" />
                Print Receipt
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
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

            <Field
              label="Payment Method"
              required
              error={errors.paymentMethod?.message}
            >
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={METHOD_OPTIONS}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
