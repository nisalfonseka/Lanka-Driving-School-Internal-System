"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import {
  trainingCreateSchema,
  trainingUpdateSchema,
} from "@/lib/validations/operations";

import { zodFieldErrors } from "./_shared";

/**
 * Practical training. A single training day may cover several vehicle classes,
 * each stored as its own row in `practical_training_classes` — never as a
 * comma-separated string.
 */

async function assertActiveVehicleClasses(ids: string[]): Promise<boolean> {
  const count = await prisma.vehicleClass.count({
    where: { id: { in: ids }, status: "ACTIVE" },
  });
  return count === ids.length;
}

export async function createTrainingAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = trainingCreateSchema.safeParse(payload);
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

    const training = await prisma.practicalTraining.create({
      data: {
        clientId: data.clientId,
        trainingDate: toUtcDateOnly(data.trainingDate),
        notes: data.notes ?? null,
        createdById: user.id,
        vehicleClasses: {
          create: data.vehicleClassIds.map((vehicleClassId) => ({
            vehicleClassId,
          })),
        },
      },
      select: {
        id: true,
        vehicleClasses: { select: { vehicleClass: { select: { code: true } } } },
      },
    });

    const codes = training.vehicleClasses
      .map((link) => link.vehicleClass.code)
      .join(", ");

    await writeAuditLog({
      userId: user.id,
      action: "CREATE_PRACTICAL_TRAINING",
      entityType: "PracticalTraining",
      entityId: training.id,
      description: `Added practical training on ${formatDate(data.trainingDate)} (${codes}) for ${client.fullName} (${client.admissionNumber})`,
      newData: { ...data, vehicleClasses: codes },
    });

    revalidatePath("/practical-training");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: training.id });
  });
}

export async function updateTrainingAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireOwnerAction();

    const parsed = trainingUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.practicalTraining.findUnique({
      where: { id: data.id },
      include: {
        client: { select: { fullName: true, admissionNumber: true } },
        vehicleClasses: { include: { vehicleClass: true } },
      },
    });
    if (!existing) return fail("That training record no longer exists.");

    if (!(await assertActiveVehicleClasses(data.vehicleClassIds))) {
      return fail("One or more selected vehicle classes are not available.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.practicalTraining.update({
        where: { id: data.id },
        data: {
          clientId: data.clientId,
          trainingDate: toUtcDateOnly(data.trainingDate),
          notes: data.notes ?? null,
          updatedById: user.id,
        },
      });

      await tx.practicalTrainingClass.deleteMany({
        where: { trainingId: data.id },
      });
      await tx.practicalTrainingClass.createMany({
        data: data.vehicleClassIds.map((vehicleClassId) => ({
          trainingId: data.id,
          vehicleClassId,
        })),
      });
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_PRACTICAL_TRAINING",
      entityType: "PracticalTraining",
      entityId: data.id,
      description: `Corrected practical training for ${existing.client.fullName} (${existing.client.admissionNumber})`,
      oldData: {
        trainingDate: existing.trainingDate,
        notes: existing.notes,
        vehicleClasses: existing.vehicleClasses
          .map((link) => link.vehicleClass.code)
          .join(", "),
      },
      newData: {
        trainingDate: data.trainingDate,
        notes: data.notes,
        vehicleClassIds: data.vehicleClassIds,
      },
    });

    revalidatePath("/practical-training");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: data.id });
  });
}
