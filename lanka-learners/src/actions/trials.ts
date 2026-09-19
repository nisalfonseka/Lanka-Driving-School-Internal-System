"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, humanise } from "@/lib/format";
import {
  trialCreateSchema,
  trialResultSchema,
  trialUpdateSchema,
} from "@/lib/validations/operations";

import {
  assertActiveVehicleClasses,
  expireCache,
  zodFieldErrors,
} from "./_shared";

/**
 * Practical trials. A client may sit as many as needed, and every trial belongs
 * to one vehicle class so that each class carries its own result.
 */

export async function createTrialAction(
  payload: unknown
): Promise<ActionResult<{ ids: string[] }>> {
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

    if (!(await assertActiveVehicleClasses(data.vehicleClassIds))) {
      return fail("One or more selected vehicle classes are not available.");
    }

    const classes = await prisma.vehicleClass.findMany({
      where: { id: { in: data.vehicleClassIds } },
      select: { id: true, code: true },
    });
    const codeById = new Map(classes.map((row) => [row.id, row.code]));

    // One trial per class, all or nothing.
    const trials = await prisma.$transaction(
      data.vehicleClassIds.map((vehicleClassId) =>
        prisma.trialExam.create({
          data: {
            clientId: data.clientId,
            vehicleClassId,
            trialDate: toUtcDateOnly(data.trialDate),
            dmtBarcode: data.dmtBarcode ?? null,
            result: "PENDING",
            createdById: user.id,
          },
          select: { id: true },
        })
      )
    );

    for (const [index, trial] of trials.entries()) {
      const code = codeById.get(data.vehicleClassIds[index]) ?? "";

      await writeAuditLog({
        userId: user.id,
        action: "CREATE_TRIAL",
        entityType: "TrialExam",
        entityId: trial.id,
        description: `Added practical trial on ${formatDate(data.trialDate)} (${code}) for ${client.fullName} (${client.admissionNumber})`,
        newData: {
          trialDate: data.trialDate,
          vehicleClass: code,
          dmtBarcode: data.dmtBarcode,
          result: "PENDING",
        },
      });
    }

    revalidatePath("/trials");
    revalidatePath(`/clients/${data.clientId}`);
    expireCache(CACHE_TAGS.stats);

    return ok({ ids: trials.map((trial) => trial.id) });
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
        vehicleClass: { select: { code: true } },
      },
    });
    if (!existing) return fail("That trial record no longer exists.");

    const vehicleClass = await prisma.vehicleClass.findUnique({
      where: { id: data.vehicleClassId },
      select: { code: true, status: true },
    });
    // A class that has since been deactivated may stay on an old trial; it just
    // cannot be newly chosen.
    const classChanged = data.vehicleClassId !== existing.vehicleClassId;
    if (!vehicleClass || (classChanged && vehicleClass.status !== "ACTIVE")) {
      return fail("That vehicle class is not available.");
    }

    await prisma.trialExam.update({
      where: { id: data.id },
      data: {
        clientId: data.clientId,
        vehicleClassId: data.vehicleClassId,
        trialDate: toUtcDateOnly(data.trialDate),
        dmtBarcode: data.dmtBarcode ?? null,
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
        vehicleClass: existing.vehicleClass?.code ?? null,
        dmtBarcode: existing.dmtBarcode,
      },
      newData: {
        trialDate: data.trialDate,
        vehicleClass: vehicleClass.code,
        dmtBarcode: data.dmtBarcode,
      },
    });

    revalidatePath("/trials");
    revalidatePath(`/clients/${data.clientId}`);
    expireCache(CACHE_TAGS.stats);

    return ok({ id: data.id });
  });
}

/** Records a trial outcome. Any signed-in user may do this. */
export async function updateTrialResultAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = trialResultSchema.safeParse(payload);
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
        client: { select: { id: true, fullName: true, admissionNumber: true } },
        vehicleClass: { select: { code: true } },
      },
    });
    if (!existing) return fail("That trial record no longer exists.");

    await prisma.trialExam.update({
      where: { id: data.id },
      data: {
        result: data.result,
        resultNotes: data.resultNotes ?? null,
        updatedById: user.id,
      },
    });

    const classLabel = existing.vehicleClass
      ? ` (${existing.vehicleClass.code})`
      : "";

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_TRIAL_RESULT",
      entityType: "TrialExam",
      entityId: data.id,
      description: `Set practical trial result${classLabel} to ${humanise(data.result)} for ${existing.client.fullName} (${existing.client.admissionNumber})`,
      oldData: { result: existing.result, resultNotes: existing.resultNotes },
      newData: { result: data.result, resultNotes: data.resultNotes },
    });

    revalidatePath("/trials");
    revalidatePath(`/clients/${existing.client.id}`);
    expireCache(CACHE_TAGS.stats);

    return ok({ id: data.id });
  });
}
