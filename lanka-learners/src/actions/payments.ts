"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import {
  paymentCreateSchema,
  paymentUpdateSchema,
} from "@/lib/validations/operations";

import { zodFieldErrors } from "./_shared";

/**
 * Client payments. Bill numbers are unique across the whole system, and the
 * remaining balance is always derived from these rows — never stored.
 */

export async function createPaymentAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = paymentCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { fullName: true, admissionNumber: true },
    });
    if (!client) return fail("That client no longer exists.");

    // Checked up front for a clear message; the unique index is the real guard.
    const duplicate = await prisma.clientPayment.findUnique({
      where: { billNumber: data.billNumber },
      select: { id: true },
    });
    if (duplicate) {
      return fail("This bill number has already been issued.", {
        billNumber: ["This bill number has already been issued"],
      });
    }

    const payment = await prisma.clientPayment.create({
      data: {
        clientId: data.clientId,
        paymentDate: toUtcDateOnly(data.paymentDate),
        billNumber: data.billNumber,
        amount: data.amount,
        paymentType: data.paymentType,
        description: data.description ?? null,
        createdById: user.id,
      },
      select: { id: true },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE_PAYMENT",
      entityType: "ClientPayment",
      entityId: payment.id,
      description: `Added payment of ${formatCurrency(data.amount)} (bill ${data.billNumber}) for ${client.fullName} (${client.admissionNumber})`,
      newData: data,
    });

    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: payment.id });
  });
}

export async function updatePaymentAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    // Financial corrections are owner-only.
    const user = await requireOwnerAction();

    const parsed = paymentUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.clientPayment.findUnique({
      where: { id: data.id },
      include: {
        client: { select: { fullName: true, admissionNumber: true } },
      },
    });
    if (!existing) return fail("That payment no longer exists.");

    if (existing.billNumber !== data.billNumber) {
      const clash = await prisma.clientPayment.findUnique({
        where: { billNumber: data.billNumber },
        select: { id: true },
      });
      if (clash && clash.id !== data.id) {
        return fail("This bill number has already been issued.", {
          billNumber: ["This bill number has already been issued"],
        });
      }
    }

    await prisma.clientPayment.update({
      where: { id: data.id },
      data: {
        clientId: data.clientId,
        paymentDate: toUtcDateOnly(data.paymentDate),
        billNumber: data.billNumber,
        amount: data.amount,
        paymentType: data.paymentType,
        description: data.description ?? null,
        updatedById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_PAYMENT",
      entityType: "ClientPayment",
      entityId: data.id,
      description: `Corrected payment ${existing.billNumber} for ${existing.client.fullName} (${existing.client.admissionNumber})`,
      oldData: {
        paymentDate: existing.paymentDate,
        billNumber: existing.billNumber,
        amount: existing.amount,
        paymentType: existing.paymentType,
        description: existing.description,
      },
      newData: {
        paymentDate: data.paymentDate,
        billNumber: data.billNumber,
        amount: data.amount,
        paymentType: data.paymentType,
        description: data.description,
      },
    });

    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: data.id });
  });
}
