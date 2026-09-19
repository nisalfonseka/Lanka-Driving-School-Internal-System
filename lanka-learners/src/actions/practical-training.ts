"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { diffClassLinks, summariseClassStatuses } from "@/lib/training-status";
import {
  trainingCreateSchema,
  trainingResultSchema,
  trainingUpdateSchema,
} from "@/lib/validations/operations";

import { assertActiveVehicleClasses, zodFieldErrors } from "./_shared";

/**
 * Practical training. A single training day may cover several vehicle classes,
 * each stored as its own row in `practical_training_classes` — never as a
 * comma-separated string. The status lives on that row, so each class of a day
 * is completed (or not) independently; new classes start as Completed.
 */

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
        vehicleClasses: {
          select: { status: true, vehicleClass: { select: { code: true } } },
        },
      },
    });

    const classStatuses = summariseClassStatuses(
      training.vehicleClasses.map((link) => ({
        code: link.vehicleClass.code,
        status: link.status,
      }))
    );
    const codes = training.vehicleClasses
      .map((link) => link.vehicleClass.code)
      .join(", ");

    await writeAuditLog({
      userId: user.id,
      action: "CREATE_PRACTICAL_TRAINING",
      entityType: "PracticalTraining",
      entityId: training.id,
      description: `Added practical training on ${formatDate(data.trainingDate)} (${codes}) for ${client.fullName} (${client.admissionNumber})`,
      newData: {
        trainingDate: data.trainingDate,
        classStatuses,
        notes: data.notes,
      },
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

    // Only classes being added must be active; one already on the record may
    // have been deactivated since and can stay.
    const { remove, add } = diffClassLinks(
      existing.vehicleClasses,
      data.vehicleClassIds
    );
    if (add.length > 0 && !(await assertActiveVehicleClasses(add))) {
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

      // Classes that stay are left alone so their status survives a correction.
      if (remove.length > 0) {
        await tx.practicalTrainingClass.deleteMany({
          where: { id: { in: remove.map((link) => link.id) } },
        });
      }
      if (add.length > 0) {
        await tx.practicalTrainingClass.createMany({
          data: add.map((vehicleClassId) => ({
            trainingId: data.id,
            vehicleClassId,
          })),
        });
      }
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
      },
    });

    revalidatePath("/practical-training");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: data.id });
  });
}

/** Records the outcome of each class of a training day. Any signed-in user may do this. */
export async function updateTrainingResultAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = trainingResultSchema.safeParse(payload);
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
        client: { select: { id: true, fullName: true, admissionNumber: true } },
        vehicleClasses: {
          include: { vehicleClass: { select: { code: true } } },
        },
      },
    });
    if (!existing) return fail("That training record no longer exists.");

    const linkByClassId = new Map(
      existing.vehicleClasses.map((link) => [link.vehicleClassId, link])
    );
    const updates = data.classStatuses.flatMap((row) => {
      const link = linkByClassId.get(row.vehicleClassId);
      return link ? [{ linkId: link.id, status: row.status }] : [];
    });
    if (updates.length !== data.classStatuses.length) {
      return fail("One of those classes is not part of this training day.");
    }

    await prisma.$transaction([
      ...updates.map((update) =>
        prisma.practicalTrainingClass.update({
          where: { id: update.linkId },
          data: { status: update.status },
        })
      ),
      prisma.practicalTraining.update({
        where: { id: data.id },
        data: { notes: data.notes ?? null, updatedById: user.id },
      }),
    ]);

    const newStatusByClassId = new Map(
      data.classStatuses.map((row) => [row.vehicleClassId, row.status])
    );
    const before = summariseClassStatuses(
      existing.vehicleClasses.map((link) => ({
        code: link.vehicleClass.code,
        status: link.status,
      }))
    );
    const after = summariseClassStatuses(
      existing.vehicleClasses.map((link) => ({
        code: link.vehicleClass.code,
        status: newStatusByClassId.get(link.vehicleClassId) ?? link.status,
      }))
    );

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_TRAINING_RESULT",
      entityType: "PracticalTraining",
      entityId: data.id,
      description: `Set class status for practical training on ${formatDate(existing.trainingDate)} (${after.join(", ")}) for ${existing.client.fullName} (${existing.client.admissionNumber})`,
      oldData: { classStatuses: before, notes: existing.notes },
      newData: { classStatuses: after, notes: data.notes },
    });

    revalidatePath("/practical-training");
    revalidatePath(`/clients/${existing.client.id}`);

    return ok({ id: data.id });
  });
}
