"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createExpenseAction, updateExpenseAction } from "@/actions/expenses";
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
import { expenseCreateSchema } from "@/lib/validations/operations";

import type { z } from "zod";

const CATEGORY_OPTIONS = [
  { value: "OFFICE_ACCESSORIES", label: "Office Accessories" },
  { value: "VEHICLE_REPAIRS", label: "Vehicle Repairs" },
  { value: "FUEL", label: "Fuel" },
  { value: "OTHER", label: "Other" },
];

const FUEL_OPTIONS = [
  { value: "PETROL", label: "Petrol" },
  { value: "DIESEL", label: "Diesel" },
];

type Category = "OFFICE_ACCESSORIES" | "VEHICLE_REPAIRS" | "FUEL" | "OTHER";

/** Derived from the schema — `amount` is coerced, so input != output. */
type FormInput = z.input<typeof expenseCreateSchema>;
type FormValues = z.output<typeof expenseCreateSchema>;

type ExistingExpense = {
  id: string;
  expenseDate: Date | string;
  category: Category;
  subCategory: "PETROL" | "DIESEL" | null;
  amount: number;
  description: string | null;
};

export function ExpenseDialog({ expense }: { expense?: ExistingExpense }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(expense);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: expense
      ? {
          expenseDate: toDateInputValue(expense.expenseDate),
          category: expense.category,
          subCategory: expense.subCategory ?? undefined,
          amount: expense.amount,
          description: expense.description ?? "",
        }
      : {
          expenseDate: new Date().toISOString().slice(0, 10),
          category: "OFFICE_ACCESSORIES",
          subCategory: undefined,
          amount: undefined,
          description: "",
        },
  });

  const category = watch("category");

  async function onSubmit(values: FormValues) {
    const result = isEdit
      ? await updateExpenseAction({ ...values, id: expense!.id })
      : await createExpenseAction(values);

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

    toast.success(isEdit ? "Expense updated" : "Expense recorded");
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
              Add Expense
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Correct Expense" : "Add Company Expense"}
          </DialogTitle>
          <DialogDescription>
            Record what the school spent and on what.
          </DialogDescription>
        </DialogHeader>

        <form
          id="expense-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Expense Date"
              htmlFor="expenseDate"
              required
              error={errors.expenseDate?.message}
            >
              <Input
                id="expenseDate"
                type="date"
                aria-invalid={Boolean(errors.expenseDate)}
                {...register("expenseDate")}
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

            <Field label="Category" required error={errors.category?.message}>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <SelectField
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // A subcategory only applies to fuel.
                      if (value !== "FUEL") {
                        setValue("subCategory", undefined);
                      }
                    }}
                    options={CATEGORY_OPTIONS}
                  />
                )}
              />
            </Field>

            {category === "FUEL" ? (
              <Field
                label="Fuel Type"
                required
                error={errors.subCategory?.message}
              >
                <Controller
                  control={control}
                  name="subCategory"
                  render={({ field }) => (
                    <SelectField
                      value={field.value}
                      onValueChange={field.onChange}
                      options={FUEL_OPTIONS}
                      placeholder="Select fuel type…"
                      invalid={Boolean(errors.subCategory)}
                    />
                  )}
                />
              </Field>
            ) : null}
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
          <Button type="submit" form="expense-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Expense"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
