"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, runAction, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAction, requireUserAction } from "@/lib/auth/session";
import {
  BOOKING_SLOTS,
  SEATS_PER_SLOT,
  SLOT_LABELS,
  type BookingSlot,
} from "@/lib/booking-slots";
import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, humanise } from "@/lib/format";
import {
  bookingAttendanceSchema,
  bookingCreateSchema,
  bookingUpdateSchema,
} from "@/lib/validations/operations";
import { readDate } from "@/lib/search-params";

import { zodFieldErrors } from "./_shared";

/**
 * Training bookings. Each time slot holds at most two people — one per seat.
 * The (date, slot, seat) unique index guarantees that limit even if two people
 * book the last seat at the same moment.
 */

const SLOT_FULL = "This time slot is already full (2 bookings).";

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

/** The first free seat in a slot, or null when both are taken. */
async function freeSeat(
  bookingDate: Date,
  slot: BookingSlot,
  ignoreId?: string
): Promise<number | null> {
  const taken = await prisma.trainingBooking.findMany({
    where: {
      bookingDate,
      slot,
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
    select: { seat: true },
  });
  const used = new Set(taken.map((row) => row.seat));
  for (let seat = 1; seat <= SEATS_PER_SLOT; seat += 1) {
    if (!used.has(seat)) return seat;
  }
  return null;
}

/** Seats left per slot for a day — drives the slot picker in the add dialog. */
export async function getSlotAvailabilityAction(
  date: string
): Promise<ActionResult<Record<BookingSlot, number>>> {
  return runAction(async () => {
    await requireUserAction();

    const day = readDate(date);
    if (!day) return fail("Enter a valid date.");

    const groups = await prisma.trainingBooking.groupBy({
      by: ["slot"],
      where: { bookingDate: toUtcDateOnly(day) },
      _count: { _all: true },
    });
    const counts = new Map(groups.map((row) => [row.slot, row._count._all]));

    const available = Object.fromEntries(
      BOOKING_SLOTS.map((slot) => [
        slot,
        Math.max(0, SEATS_PER_SLOT - (counts.get(slot) ?? 0)),
      ])
    ) as Record<BookingSlot, number>;

    return ok(available);
  });
}

export async function createBookingAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = bookingCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;
    const bookingDate = toUtcDateOnly(data.bookingDate);

    const seat = await freeSeat(bookingDate, data.slot);
    if (seat === null) return fail(SLOT_FULL, { slot: [SLOT_FULL] });

    let bookingId: string;
    try {
      const booking = await prisma.trainingBooking.create({
        data: {
          bookingDate,
          slot: data.slot,
          seat,
          name: data.name,
          contactNumber: data.contactNumber,
          createdById: user.id,
        },
        select: { id: true },
      });
      bookingId = booking.id;
    } catch (error) {
      // Someone else took the last seat between our check and the insert.
      if (isUniqueViolation(error)) return fail(SLOT_FULL, { slot: [SLOT_FULL] });
      throw error;
    }

    await writeAuditLog({
      userId: user.id,
      action: "CREATE_TRAINING_BOOKING",
      entityType: "TrainingBooking",
      entityId: bookingId,
      description: `Booked ${data.name} for training on ${formatDate(data.bookingDate)}, ${SLOT_LABELS[data.slot]}`,
      newData: {
        bookingDate: data.bookingDate,
        timeSlot: SLOT_LABELS[data.slot],
        name: data.name,
        contactNumber: data.contactNumber,
      },
    });

    revalidatePath("/training-bookings");

    return ok({ id: bookingId });
  });
}

/** Full correction of a booking — owners only. */
export async function updateBookingAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireOwnerAction();

    const parsed = bookingUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;
    const bookingDate = toUtcDateOnly(data.bookingDate);

    const existing = await prisma.trainingBooking.findUnique({
      where: { id: data.id },
    });
    if (!existing) return fail("That booking no longer exists.");

    // Keep the same seat unless the booking moves to another date or slot.
    const moved =
      existing.slot !== data.slot ||
      existing.bookingDate.getTime() !== bookingDate.getTime();
    const seat = moved
      ? await freeSeat(bookingDate, data.slot, data.id)
      : existing.seat;
    if (seat === null) return fail(SLOT_FULL, { slot: [SLOT_FULL] });

    try {
      await prisma.trainingBooking.update({
        where: { id: data.id },
        data: {
          bookingDate,
          slot: data.slot,
          seat,
          name: data.name,
          contactNumber: data.contactNumber,
          attendance: data.attendance,
          updatedById: user.id,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) return fail(SLOT_FULL, { slot: [SLOT_FULL] });
      throw error;
    }

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_TRAINING_BOOKING",
      entityType: "TrainingBooking",
      entityId: data.id,
      description: `Updated training booking for ${data.name} on ${formatDate(data.bookingDate)}, ${SLOT_LABELS[data.slot]}`,
      oldData: {
        bookingDate: existing.bookingDate,
        timeSlot: SLOT_LABELS[existing.slot],
        name: existing.name,
        contactNumber: existing.contactNumber,
        attendance: existing.attendance,
      },
      newData: {
        bookingDate: data.bookingDate,
        timeSlot: SLOT_LABELS[data.slot],
        name: data.name,
        contactNumber: data.contactNumber,
        attendance: data.attendance,
      },
    });

    revalidatePath("/training-bookings");

    return ok({ id: data.id });
  });
}

/** Marks a booking present / absent. Any signed-in user may do this. */
export async function updateBookingAttendanceAction(
  payload: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUserAction();

    const parsed = bookingAttendanceSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "Please correct the highlighted fields.",
        zodFieldErrors(parsed.error)
      );
    }

    const data = parsed.data;

    const existing = await prisma.trainingBooking.findUnique({
      where: { id: data.id },
    });
    if (!existing) return fail("That booking no longer exists.");

    await prisma.trainingBooking.update({
      where: { id: data.id },
      data: { attendance: data.attendance, updatedById: user.id },
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_BOOKING_ATTENDANCE",
      entityType: "TrainingBooking",
      entityId: data.id,
      description: `Marked ${existing.name} ${humanise(data.attendance).toLowerCase()} for training on ${formatDate(existing.bookingDate)}, ${SLOT_LABELS[existing.slot]}`,
      oldData: { attendance: existing.attendance },
      newData: { attendance: data.attendance },
    });

    revalidatePath("/training-bookings");

    return ok({ id: data.id });
  });
}

/** Frees the seat. Owners only — employees can never remove a record. */
export async function deleteBookingAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireOwnerAction();

    const existing = await prisma.trainingBooking.findUnique({ where: { id } });
    if (!existing) return fail("That booking no longer exists.");

    await prisma.trainingBooking.delete({ where: { id } });

    await writeAuditLog({
      userId: user.id,
      action: "DELETE_TRAINING_BOOKING",
      entityType: "TrainingBooking",
      entityId: id,
      description: `Cancelled training booking for ${existing.name} on ${formatDate(existing.bookingDate)}, ${SLOT_LABELS[existing.slot]}`,
      oldData: {
        bookingDate: existing.bookingDate,
        timeSlot: SLOT_LABELS[existing.slot],
        name: existing.name,
        contactNumber: existing.contactNumber,
        attendance: existing.attendance,
      },
    });

    revalidatePath("/training-bookings");

    return ok({ id });
  });
}
