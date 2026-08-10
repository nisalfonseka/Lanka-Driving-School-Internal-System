"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { requireOwnerAction } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  employeeCreateSchema,
  employeeStatusSchema,
  employeeUpdateSchema,
  passwordResetSchema,
} from "@/lib/validations/admin";

import { zodFieldErrors } from "./_shared";

/**
 * Employee administration — owner only, every action audited.
 *
 * Passwords are hashed before they touch the database and are never written to
 * an audit entry. Deactivating an account or resetting its password bumps
 * `tokenVersion`, which immediately invalidates any session already issued to
 * that user.
 */

export async function createEmployeeAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();

    const parsed = employeeCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { username: data.username },
      select: { id: true },
    });
    if (existing) {
      return fail("This username is already taken.", {
        username: ["This username is already taken"],
      });
    }

    const employee = await prisma.user.create({
      data: {
        fullName: data.fullName,
        username: data.username,
        email: data.email ?? null,
        mobile: data.mobile ?? null,
        passwordHash: await hashPassword(data.password),
        // The role is fixed here — the UI cannot mint another owner.
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
      select: { id: true, fullName: true, username: true },
    });

    await writeAuditLog({
      userId: owner.id,
      action: "CREATE_EMPLOYEE",
      entityType: "User",
      entityId: employee.id,
      description: `Created employee account ${employee.fullName} (@${employee.username})`,
      // Note: no password material of any kind.
      newData: {
        fullName: data.fullName,
        username: data.username,
        email: data.email ?? null,
        mobile: data.mobile ?? null,
        role: "EMPLOYEE",
      },
    });

    revalidatePath("/employees");

    return ok({ id: employee.id });
  });
}

export async function updateEmployeeAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();

    const parsed = employeeUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.user.findUnique({ where: { id: data.id } });
    if (!existing) return fail("That employee no longer exists.");
    if (existing.role === "OWNER" && existing.id !== owner.id) {
      return fail("Another owner account cannot be modified here.");
    }

    await prisma.user.update({
      where: { id: data.id },
      data: {
        fullName: data.fullName,
        email: data.email ?? null,
        mobile: data.mobile ?? null,
      },
    });

    await writeAuditLog({
      userId: owner.id,
      action: "UPDATE_EMPLOYEE",
      entityType: "User",
      entityId: data.id,
      description: `Updated employee ${data.fullName} (@${existing.username})`,
      oldData: {
        fullName: existing.fullName,
        email: existing.email,
        mobile: existing.mobile,
      },
      newData: {
        fullName: data.fullName,
        email: data.email ?? null,
        mobile: data.mobile ?? null,
      },
    });

    revalidatePath("/employees");

    return ok({ id: data.id });
  });
}

export async function setEmployeeStatusAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();

    const parsed = employeeStatusSchema.safeParse(payload);
    if (!parsed.success) return fail("Invalid request.");

    const data = parsed.data;

    const existing = await prisma.user.findUnique({ where: { id: data.id } });
    if (!existing) return fail("That employee no longer exists.");

    if (existing.id === owner.id) {
      return fail("You cannot change the status of your own account.");
    }
    if (existing.role === "OWNER") {
      return fail("Owner accounts cannot be deactivated here.");
    }

    await prisma.user.update({
      where: { id: data.id },
      data: {
        status: data.status,
        // Deactivating revokes any session the employee currently holds.
        ...(data.status === "INACTIVE"
          ? { tokenVersion: { increment: 1 } }
          : {}),
      },
    });

    await writeAuditLog({
      userId: owner.id,
      action: data.status === "INACTIVE" ? "DEACTIVATE_EMPLOYEE" : "ACTIVATE_EMPLOYEE",
      entityType: "User",
      entityId: data.id,
      description: `${data.status === "INACTIVE" ? "Deactivated" : "Activated"} employee ${existing.fullName} (@${existing.username})`,
      oldData: { status: existing.status },
      newData: { status: data.status },
    });

    revalidatePath("/employees");

    return ok({ id: data.id });
  });
}

export async function resetEmployeePasswordAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const owner = await requireOwnerAction();

    const parsed = passwordResetSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.user.findUnique({ where: { id: data.id } });
    if (!existing) return fail("That employee no longer exists.");
    if (existing.role === "OWNER" && existing.id !== owner.id) {
      return fail("Another owner's password cannot be reset here.");
    }

    await prisma.user.update({
      where: { id: data.id },
      data: {
        passwordHash: await hashPassword(data.password),
        // Force every existing session for this user to stop validating.
        tokenVersion: { increment: 1 },
      },
    });

    await writeAuditLog({
      userId: owner.id,
      action: "RESET_EMPLOYEE_PASSWORD",
      entityType: "User",
      entityId: data.id,
      description: `Reset the password for ${existing.fullName} (@${existing.username})`,
      // The password itself is deliberately absent from the audit record.
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${data.id}`);

    return ok({ id: data.id });
  });
}
