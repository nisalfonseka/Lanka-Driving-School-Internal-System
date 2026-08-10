"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  settingsSchema,
  vehicleClassCreateSchema,
  vehicleClassUpdateSchema,
} from "@/lib/validations/admin";

import { zodFieldErrors } from "./_shared";

/** Vehicle classes and business settings — owner only. */

export async function createVehicleClassAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();

    const parsed = vehicleClassCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.vehicleClass.findUnique({
      where: { code: data.code },
      select: { id: true },
    });
    if (existing) {
      return fail("A vehicle class with this code already exists.", {
        code: ["This code is already in use"],
      });
    }

    const created = await prisma.vehicleClass.create({
      data: { code: data.code, name: data.name },
      select: { id: true },
    });

    await writeAuditLog({
      userId: owner.id,
      action: "CREATE_VEHICLE_CLASS",
      entityType: "VehicleClass",
      entityId: created.id,
      description: `Added vehicle class ${data.code} — ${data.name}`,
      newData: data,
    });

    revalidatePath("/settings");

    return ok({ id: created.id });
  });
}

export async function updateVehicleClassAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();

    const parsed = vehicleClassUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.vehicleClass.findUnique({
      where: { id: data.id },
    });
    if (!existing) return fail("That vehicle class no longer exists.");

    if (existing.code !== data.code) {
      const clash = await prisma.vehicleClass.findUnique({
        where: { code: data.code },
        select: { id: true },
      });
      if (clash && clash.id !== data.id) {
        return fail("A vehicle class with this code already exists.", {
          code: ["This code is already in use"],
        });
      }
    }

    await prisma.vehicleClass.update({
      where: { id: data.id },
      data: { code: data.code, name: data.name, status: data.status },
    });

    await writeAuditLog({
      userId: owner.id,
      action: "UPDATE_VEHICLE_CLASS",
      entityType: "VehicleClass",
      entityId: data.id,
      description: `Updated vehicle class ${data.code} — ${data.name}`,
      oldData: {
        code: existing.code,
        name: existing.name,
        status: existing.status,
      },
      newData: { code: data.code, name: data.name, status: data.status },
    });

    revalidatePath("/settings");

    return ok({ id: data.id });
  });
}

export async function updateSettingsAction(
  payload: unknown
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();

    const parsed = settingsSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const previous = await prisma.systemSetting.findMany();

    await prisma.$transaction(
      Object.entries(data).map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          create: { key, value: value ?? "" },
          update: { value: value ?? "" },
        })
      )
    );

    await writeAuditLog({
      userId: owner.id,
      action: "UPDATE_SETTINGS",
      entityType: "SystemSetting",
      description: "Updated system settings",
      oldData: Object.fromEntries(
        previous.map((row) => [row.key, row.value])
      ),
      newData: data,
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");

    return ok(null);
  });
}
