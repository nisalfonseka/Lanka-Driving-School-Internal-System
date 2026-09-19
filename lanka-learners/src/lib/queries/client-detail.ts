import "server-only";

import { prisma } from "@/lib/db";
import { countCompletedTrainingDays } from "@/lib/training-status";

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
          vehicleClass: { select: { id: true, code: true, name: true } },
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
        },
      }),
      prisma.lectureAttendance.findMany({
        where: { clientId },
        orderBy: { attendanceDate: "desc" },
        take: RECORD_LIMIT,
        include: {
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
        },
      }),
      prisma.practicalTraining.findMany({
        where: { clientId },
        orderBy: { trainingDate: "desc" },
        take: RECORD_LIMIT,
        include: {
          createdBy: { select: { fullName: true } },
          updatedBy: { select: { fullName: true } },
          vehicleClasses: {
            include: { vehicleClass: true },
            orderBy: { vehicleClass: { code: "asc" } },
          },
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


  return {
    exams,
    trials,
    lectures,
    trainings,
    payments,
    history,
    trainingSummary: {
      completedDays: countCompletedTrainingDays(trainings),
    },
    lectureSummary: {
      total: lectures.length,
      present: lectures.filter((row) => row.status === "PRESENT").length,
    },
  };
}
