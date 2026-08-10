"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatCurrency, humanise } from "@/lib/format";
import {
  expenseCreateSchema,
  expenseUpdateSchema,
} from "@/lib/validations/operations";

import { zodFieldErrors } from "./_shared";

/** Company expenses. Employees may record them; only owners may correct them. */

export async function createExpenseAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = expenseCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const expense = await prisma.companyExpense.create({
      data: {
        expenseDate: toUtcDateOnly(data.expenseDate),
        category: data.category,
        // A subcategory only applies to fuel.
        subCategory: data.category === "FUEL" ? (data.subCategory ?? null) : null,
        amount: data.amount,
        description: data.description ?? null,
        createdById: user.id,
      },
      select: { id: true },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE_EXPENSE",
      entityType: "CompanyExpense",
      entityId: expense.id,
      description: `Added ${humanise(data.category)} expense of ${formatCurrency(data.amount)}`,
      newData: data,
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return ok({ id: expense.id });
  });
}

export async function updateExpenseAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireOwnerAction();

    const parsed = expenseUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.companyExpense.findUnique({
      where: { id: data.id },
    });
    if (!existing) return fail("That expense no longer exists.");

    await prisma.companyExpense.update({
      where: { id: data.id },
      data: {
        expenseDate: toUtcDateOnly(data.expenseDate),
        category: data.category,
        subCategory: data.category === "FUEL" ? (data.subCategory ?? null) : null,
        amount: data.amount,
        description: data.description ?? null,
        updatedById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_EXPENSE",
      entityType: "CompanyExpense",
      entityId: data.id,
      description: `Corrected ${humanise(data.category)} expense of ${formatCurrency(data.amount)}`,
      oldData: {
        expenseDate: existing.expenseDate,
        category: existing.category,
        subCategory: existing.subCategory,
        amount: existing.amount,
        description: existing.description,
      },
      newData: {
        expenseDate: data.expenseDate,
        category: data.category,
        subCategory: data.subCategory,
        amount: data.amount,
        description: data.description,
      },
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");

    return ok({ id: data.id });
  });
}
