"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { examCreateSchema, examUpdateSchema } from "@/lib/validations/operations";

import { zodFieldErrors } from "./_shared";

/**
 * Written exams. Employees may add attempts; only owners may correct one that
 * has already been recorded.
 */

export async function createExamAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = examCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", zodFieldErrors(parsed.error));
    }

    const data = parsed.data;

    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { id: true, fullName: true, admissionNumber: true },
    });
    if (!client) return fail("That client no longer exists.");

    const exam = await prisma.writtenExam.create({
      data: {
        clientId: data.clientId,
        examDate: toUtcDateOnly(data.examDate),
        dmtBarcode: data.dmtBarcode ?? null,
        attendance: data.attendance,
        result: data.result,
        createdById: user.id,
      },
      select: { id: true },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE_EXAM",
      entityType: "WrittenExam",
      entityId: exam.id,
      description: `Added written exam on ${formatDate(data.examDate)} for ${client.fullName} (${client.admissionNumber})`,
      newData: data,
    });

    revalidatePath("/exams");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: exam.id });
  });
}

export async function updateExamAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    // Employees cannot edit an existing exam record.
    const user = await requireOwnerAction();

    const parsed = examUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", zodFieldErrors(parsed.error));
    }

    const data = parsed.data;

    const existing = await prisma.writtenExam.findUnique({
      where: { id: data.id },
      include: {
        client: { select: { fullName: true, admissionNumber: true } },
      },
    });
    if (!existing) return fail("That exam record no longer exists.");

    await prisma.writtenExam.update({
      where: { id: data.id },
      data: {
        clientId: data.clientId,
        examDate: toUtcDateOnly(data.examDate),
        dmtBarcode: data.dmtBarcode ?? null,
        attendance: data.attendance,
        result: data.result,
        updatedById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_EXAM",
      entityType: "WrittenExam",
      entityId: data.id,
      description: `Corrected written exam for ${existing.client.fullName} (${existing.client.admissionNumber})`,
      oldData: {
        examDate: existing.examDate,
        dmtBarcode: existing.dmtBarcode,
        attendance: existing.attendance,
        result: existing.result,
      },
      newData: {
        examDate: data.examDate,
        dmtBarcode: data.dmtBarcode,
        attendance: data.attendance,
        result: data.result,
      },
    });

    revalidatePath("/exams");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: data.id });
  });
}
