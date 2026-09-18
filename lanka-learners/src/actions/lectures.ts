"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, humanise } from "@/lib/format";
import {
  lectureCreateSchema,
  lectureResultSchema,
  lectureUpdateSchema,
} from "@/lib/validations/operations";

import { zodFieldErrors } from "./_shared";

/**
 * Lecture attendance. One record per client per day — the database enforces
 * this with a unique constraint, so a double entry is rejected rather than
 * silently duplicating the day.
 */

export async function createLectureAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = lectureCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;
    const attendanceDate = toUtcDateOnly(data.attendanceDate);

    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { fullName: true, admissionNumber: true },
    });
    if (!client) return fail("That client no longer exists.");

    const duplicate = await prisma.lectureAttendance.findUnique({
      where: {
        clientId_attendanceDate: { clientId: data.clientId, attendanceDate },
      },
      select: { id: true },
    });
    if (duplicate) {
      return fail(
        `Attendance for ${client.fullName} on ${formatDate(data.attendanceDate)} has already been recorded.`,
        { attendanceDate: ["Already recorded for this client"] }
      );
    }

    const lecture = await prisma.lectureAttendance.create({
      data: {
        clientId: data.clientId,
        attendanceDate,
        status: "PENDING",
        createdById: user.id,
      },
      select: { id: true },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE_LECTURE_ATTENDANCE",
      entityType: "LectureAttendance",
      entityId: lecture.id,
      description: `Added lecture on ${formatDate(data.attendanceDate)} for ${client.fullName} (${client.admissionNumber})`,
      newData: { attendanceDate: data.attendanceDate, status: "PENDING" },
    });

    revalidatePath("/lectures");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: lecture.id });
  });
}

export async function updateLectureAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireOwnerAction();

    const parsed = lectureUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.lectureAttendance.findUnique({
      where: { id: data.id },
      include: {
        client: { select: { fullName: true, admissionNumber: true } },
      },
    });
    if (!existing) return fail("That attendance record no longer exists.");

    await prisma.lectureAttendance.update({
      where: { id: data.id },
      data: {
        clientId: data.clientId,
        attendanceDate: toUtcDateOnly(data.attendanceDate),
        updatedById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_LECTURE_ATTENDANCE",
      entityType: "LectureAttendance",
      entityId: data.id,
      description: `Corrected lecture attendance for ${existing.client.fullName} (${existing.client.admissionNumber})`,
      oldData: { attendanceDate: existing.attendanceDate },
      newData: { attendanceDate: data.attendanceDate },
    });

    revalidatePath("/lectures");
    revalidatePath(`/clients/${data.clientId}`);

    return ok({ id: data.id });
  });
}

/** Records the lecture outcome (present, absent, cancelled). Any signed-in user may do this. */
export async function updateLectureResultAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = lectureResultSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.lectureAttendance.findUnique({
      where: { id: data.id },
      include: {
        client: { select: { id: true, fullName: true, admissionNumber: true } },
      },
    });
    if (!existing) return fail("That attendance record no longer exists.");

    await prisma.lectureAttendance.update({
      where: { id: data.id },
      data: { status: data.status, updatedById: user.id },
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_LECTURE_RESULT",
      entityType: "LectureAttendance",
      entityId: data.id,
      description: `Set lecture on ${formatDate(existing.attendanceDate)} to ${humanise(data.status)} for ${existing.client.fullName} (${existing.client.admissionNumber})`,
      oldData: { status: existing.status },
      newData: { status: data.status },
    });

    revalidatePath("/lectures");
    revalidatePath(`/clients/${existing.client.id}`);

    return ok({ id: data.id });
  });
}
