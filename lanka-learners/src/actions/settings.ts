"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction } from "@/lib/auth/session";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { smsSettingsRows } from "@/lib/sms/settings";
import {
  branchCreateSchema,
  branchUpdateSchema,
  settingsSchema,
  smsSettingsSchema,
  vehicleClassCreateSchema,
  vehicleClassUpdateSchema,
} from "@/lib/validations/admin";

import { expireCache, zodFieldErrors } from "./_shared";

/** Vehicle classes and business settings — owner only. */

export async function createBranchAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();
    const parsed = branchCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", zodFieldErrors(parsed.error));
    }

    const data = parsed.data;
    const clash = await prisma.branch.findFirst({
      where: { OR: [{ code: data.code }, { name: { equals: data.name, mode: "insensitive" } }] },
      select: { code: true, name: true },
    });
    if (clash) {
      return fail("A branch with this code or name already exists.");
    }

    const branch = await prisma.branch.create({ data, select: { id: true } });
    await writeAuditLog({
      userId: owner.id,
      action: "CREATE_BRANCH",
      entityType: "Branch",
      entityId: branch.id,
      description: `Added branch ${data.name} (${data.code})`,
      newData: data,
    });
    revalidatePath("/settings");
    revalidatePath("/employees");
    expireCache(CACHE_TAGS.branches);
    return ok({ id: branch.id });
  });
}

export async function updateBranchAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();
    const parsed = branchUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", zodFieldErrors(parsed.error));
    }

    const data = parsed.data;
    const existing = await prisma.branch.findUnique({ where: { id: data.id } });
    if (!existing) return fail("That branch no longer exists.");

    if (data.status === "INACTIVE") {
      const activeEmployees = await prisma.user.count({
        where: { branchId: data.id, role: "EMPLOYEE", status: "ACTIVE" },
      });
      if (activeEmployees > 0) {
        return fail("Move or deactivate the active employees in this branch first.");
      }
    }

    const clash = await prisma.branch.findFirst({
      where: {
        id: { not: data.id },
        OR: [{ code: data.code }, { name: { equals: data.name, mode: "insensitive" } }],
      },
      select: { id: true },
    });
    if (clash) return fail("A branch with this code or name already exists.");

    await prisma.branch.update({
      where: { id: data.id },
      data: { code: data.code, name: data.name, status: data.status },
    });
    await writeAuditLog({
      userId: owner.id,
      action: "UPDATE_BRANCH",
      entityType: "Branch",
      entityId: data.id,
      description: `Updated branch ${data.name} (${data.code})`,
      oldData: { code: existing.code, name: existing.name, status: existing.status },
      newData: { code: data.code, name: data.name, status: data.status },
    });
    revalidatePath("/settings");
    revalidatePath("/employees");
    expireCache(CACHE_TAGS.branches);
    return ok({ id: data.id });
  });
}

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
    expireCache(CACHE_TAGS.vehicleClasses);

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
    expireCache(CACHE_TAGS.vehicleClasses);

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
    expireCache(CACHE_TAGS.settings);

    return ok(null);
  });
}

export async function updateSmsSettingsAction(
  payload: unknown
): Promise<ActionResult<null>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();

    const parsed = smsSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    if (parsed.data.enabled && !parsed.data.senderId) {
      return fail("Enter the approved Text.lk sender ID before enabling SMS.", {
        senderId: ["Sender ID is required when SMS is enabled"],
      });
    }

    const rows = smsSettingsRows(parsed.data);
    const previous = await prisma.systemSetting.findMany({
      where: { key: { in: rows.map((row) => row.key) } },
    });

    await prisma.$transaction(
      rows.map(({ key, value }) =>
        prisma.systemSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        })
      )
    );

    await writeAuditLog({
      userId: owner.id,
      action: "UPDATE_SETTINGS",
      entityType: "SmsSettings",
      description: "Updated SMS notification settings",
      oldData: Object.fromEntries(
        previous.map((row) => [row.key, row.value])
      ),
      newData: Object.fromEntries(rows.map((row) => [row.key, row.value])),
    });

    revalidatePath("/settings");
    expireCache(CACHE_TAGS.settings);

    return ok(null);
  });
}
