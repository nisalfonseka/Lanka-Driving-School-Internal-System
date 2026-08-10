import "server-only";

import { prisma } from "@/lib/db";

const RECORD_LIMIT = 100;

/**
 * Everything shown on the client profile tabs, fetched in one round trip.
 * Each list is capped so a long-standing client cannot produce an unbounded
 * payload.
 */
export async function getClientRecords(clientId: string) {
  const [exams, trials, lectures, trainings, payments, history] =
    await Promise.all([
      prisma.writtenExam.findMany({
        where: { clientId },
        orderBy: { examDate: "desc" },
        take: RECORD_LIMIT,
        include: {
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
        },
      }),
      prisma.trialExam.findMany({
        where: { clientId },
        orderBy: { trialDate: "desc" },
        take: RECORD_LIMIT,
        include: {
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
        },
      }),
      prisma.lectureAttendance.findMany({
        where: { clientId },
        orderBy: { attendanceDate: "desc" },
        take: RECORD_LIMIT,
        include: { createdBy: { select: { fullName: true } } },
      }),
      prisma.practicalTraining.findMany({
        where: { clientId },
        orderBy: { trainingDate: "desc" },
        take: RECORD_LIMIT,
        include: {
          createdBy: { select: { fullName: true } },
          vehicleClasses: { include: { vehicleClass: true } },
        },
      }),
      prisma.clientPayment.findMany({
        where: { clientId },
        orderBy: { paymentDate: "desc" },
        take: RECORD_LIMIT,
        include: { createdBy: { select: { fullName: true } } },
      }),
      prisma.auditLog.findMany({
        where: { entityType: "Client", entityId: clientId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { fullName: true } } },
      }),
    ]);

  // Training days counted per vehicle class — a single day covering B and
  // B AUTO counts once for each.
  const trainingDaysByClass = new Map<string, number>();
  for (const training of trainings) {
    for (const link of training.vehicleClasses) {
      const code = link.vehicleClass.code;
      trainingDaysByClass.set(code, (trainingDaysByClass.get(code) ?? 0) + 1);
    }
  }

  return {
    exams,
    trials,
    lectures,
    trainings,
    payments,
    history,
    trainingSummary: {
      totalDays: trainings.length,
      byClass: [...trainingDaysByClass.entries()]
        .map(([code, days]) => ({ code, days }))
        .sort((a, b) => b.days - a.days),
    },
    lectureSummary: {
      total: lectures.length,
      present: lectures.filter((row) => row.status === "PRESENT").length,
    },
  };
}
