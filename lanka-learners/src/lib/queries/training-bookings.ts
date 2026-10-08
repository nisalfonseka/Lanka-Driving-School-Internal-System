import "server-only";

import { toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";

/** All bookings for one calendar day, in timetable order. */
export async function getBookingsForDay(date: string, branchId: string) {
  return prisma.trainingBooking.findMany({
    where: { bookingDate: toUtcDateOnly(date), branchId },
    orderBy: [{ slot: "asc" }, { seat: "asc" }],
    include: {
      createdBy: { select: { fullName: true } },
      updatedBy: { select: { fullName: true } },
    },
  });
}
