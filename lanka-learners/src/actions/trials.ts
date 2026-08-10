"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import {
  trialCreateSchema,
  trialUpdateSchema,
} from "@/lib/validations/operations";

import { zodFieldErrors } from "./_shared";

/** Practical trials. A client may sit as many as needed. */

export async function createTrialAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = trialCreateSchema.safeParse(payload);
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

    const trial = await prisma.trialExam.create({
      data: {
        clientId: data.clientId,
        trialDate: toUtcDateOnly(data.trialDate),
        dmtBarcode: data.dmtBarcode ?? null,
        result: data.result,
        resultNotes: data.resultNotes ?? null,
        createdById: user.id,
      },
      select: { id: true },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE_TRIAL",
      entityType: "TrialExam",
      entityId: trial.id,
      description: `Added practical trial on ${formatDate(data.trialDate)} for ${client.fullName} (${client.admissionNumber})`,
      newData: data,
    });

    revalidatePath("/trials");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: trial.id });
  });
}

export async function updateTrialAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireOwnerAction();

    const parsed = trialUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.trialExam.findUnique({
      where: { id: data.id },
      include: {
        client: { select: { fullName: true, admissionNumber: true } },
      },
    });
    if (!existing) return fail("That trial record no longer exists.");

    await prisma.trialExam.update({
      where: { id: data.id },
      data: {
        clientId: data.clientId,
        trialDate: toUtcDateOnly(data.trialDate),
        dmtBarcode: data.dmtBarcode ?? null,
        result: data.result,
        resultNotes: data.resultNotes ?? null,
        updatedById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_TRIAL",
      entityType: "TrialExam",
      entityId: data.id,
      description: `Corrected practical trial for ${existing.client.fullName} (${existing.client.admissionNumber})`,
      oldData: {
        trialDate: existing.trialDate,
        dmtBarcode: existing.dmtBarcode,
        result: existing.result,
        resultNotes: existing.resultNotes,
      },
      newData: {
        trialDate: data.trialDate,
        dmtBarcode: data.dmtBarcode,
        result: data.result,
        resultNotes: data.resultNotes,
      },
    });

    revalidatePath("/trials");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: data.id });
  });
}
