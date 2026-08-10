import "server-only";

import { endOfUtcDay, toUtcDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const RECORDS_PAGE_SIZE = 20;

export type RecordFilterInput = {
  q?: string;
  clientId?: string;
  from?: string;
  to?: string;
  page: number;
  extra?: Record<string, string | undefined>;
};

/** Matches a free-text query against the related client. */
function clientMatch(q: string | undefined): Prisma.ClientWhereInput | undefined {
  if (!q) return undefined;
  return {
    OR: [
      { fullName: { contains: q, mode: "insensitive" } },
      { idNumber: { contains: q, mode: "insensitive" } },
      { admissionNumber: { contains: q, mode: "insensitive" } },
    ],
  };
}

function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: toUtcDateOnly(from) } : {}),
    ...(to ? { lte: endOfUtcDay(to) } : {}),
  };
}

const clientSelect = {
  select: {
    id: true,
    fullName: true,
    admissionNumber: true,
    idNumber: true,
  },
} as const;

const enteredBy = {
  createdBy: { select: { fullName: true } },
  updatedBy: { select: { fullName: true } },
} as const;

export function offsetFor(page: number) {
  return (Math.max(1, page) - 1) * RECORDS_PAGE_SIZE;
}

// ---------------------------------------------------------------------------

export async function searchExams(input: RecordFilterInput) {
  const where: Prisma.WrittenExamWhereInput = {
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(clientMatch(input.q) ? { client: clientMatch(input.q) } : {}),
    ...(dateRange(input.from, input.to)
      ? { examDate: dateRange(input.from, input.to) }
      : {}),
    ...(input.extra?.result
      ? { result: input.extra.result as Prisma.EnumExamResultFilter["equals"] }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.writtenExam.findMany({
      where,
      orderBy: { examDate: "desc" },
      skip: offsetFor(input.page),
      take: RECORDS_PAGE_SIZE,
      include: { client: clientSelect, ...enteredBy },
    }),
    prisma.writtenExam.count({ where }),
  ]);

  return { rows, total, page: Math.max(1, input.page), pageSize: RECORDS_PAGE_SIZE };
}

export async function searchTrials(input: RecordFilterInput) {
  const where: Prisma.TrialExamWhereInput = {
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(clientMatch(input.q) ? { client: clientMatch(input.q) } : {}),
    ...(dateRange(input.from, input.to)
      ? { trialDate: dateRange(input.from, input.to) }
      : {}),
    ...(input.extra?.result
      ? { result: input.extra.result as Prisma.EnumTrialResultFilter["equals"] }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.trialExam.findMany({
      where,
      orderBy: { trialDate: "desc" },
      skip: offsetFor(input.page),
      take: RECORDS_PAGE_SIZE,
      include: { client: clientSelect, ...enteredBy },
    }),
    prisma.trialExam.count({ where }),
  ]);

  return { rows, total, page: Math.max(1, input.page), pageSize: RECORDS_PAGE_SIZE };
}

export async function searchLectures(input: RecordFilterInput) {
  const where: Prisma.LectureAttendanceWhereInput = {
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(clientMatch(input.q) ? { client: clientMatch(input.q) } : {}),
    ...(dateRange(input.from, input.to)
      ? { attendanceDate: dateRange(input.from, input.to) }
      : {}),
    ...(input.extra?.status
      ? {
          status: input.extra
            .status as Prisma.EnumAttendanceStatusFilter["equals"],
        }
      : {}),
  };

  const [rows, total, presentCount] = await Promise.all([
    prisma.lectureAttendance.findMany({
      where,
      orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
      skip: offsetFor(input.page),
      take: RECORDS_PAGE_SIZE,
      include: { client: clientSelect, ...enteredBy },
    }),
    prisma.lectureAttendance.count({ where }),
    prisma.lectureAttendance.count({ where: { ...where, status: "PRESENT" } }),
  ]);

  return {
    rows,
    total,
    presentCount,
    page: Math.max(1, input.page),
    pageSize: RECORDS_PAGE_SIZE,
  };
}

export async function searchTrainings(input: RecordFilterInput) {
  const vehicleClassId = input.extra?.vehicleClassId;

  const where: Prisma.PracticalTrainingWhereInput = {
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(clientMatch(input.q) ? { client: clientMatch(input.q) } : {}),
    ...(dateRange(input.from, input.to)
      ? { trainingDate: dateRange(input.from, input.to) }
      : {}),
    ...(vehicleClassId
      ? { vehicleClasses: { some: { vehicleClassId } } }
      : {}),
  };

  const [rows, total, matchingClasses] = await Promise.all([
    prisma.practicalTraining.findMany({
      where,
      orderBy: { trainingDate: "desc" },
      skip: offsetFor(input.page),
      take: RECORDS_PAGE_SIZE,
      include: {
        client: clientSelect,
        ...enteredBy,
        vehicleClasses: { include: { vehicleClass: true } },
      },
    }),
    prisma.practicalTraining.count({ where }),
    // Totals cover the whole filtered set, not just the current page.
    prisma.practicalTrainingClass.findMany({
      where: { training: where },
      select: { vehicleClass: { select: { code: true } } },
    }),
  ]);

  const byClass = new Map<string, number>();
  for (const link of matchingClasses) {
    const code = link.vehicleClass.code;
    byClass.set(code, (byClass.get(code) ?? 0) + 1);
  }

  return {
    rows,
    total,
    page: Math.max(1, input.page),
    pageSize: RECORDS_PAGE_SIZE,
    summary: {
      totalDays: total,
      byClass: [...byClass.entries()]
        .map(([code, days]) => ({ code, days }))
        .sort((a, b) => b.days - a.days),
    },
  };
}

export async function searchPayments(input: RecordFilterInput) {
  const where: Prisma.ClientPaymentWhereInput = {
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(dateRange(input.from, input.to)
      ? { paymentDate: dateRange(input.from, input.to) }
      : {}),
    ...(input.extra?.paymentType
      ? {
          paymentType: input.extra
            .paymentType as Prisma.EnumPaymentTypeFilter["equals"],
        }
      : {}),
  };

  // A free-text query matches either the bill number or the client.
  if (input.q) {
    where.OR = [
      { billNumber: { contains: input.q, mode: "insensitive" } },
      { client: clientMatch(input.q) },
    ];
  }

  const [rows, total, sum] = await Promise.all([
    prisma.clientPayment.findMany({
      where,
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      skip: offsetFor(input.page),
      take: RECORDS_PAGE_SIZE,
      include: { client: clientSelect, ...enteredBy },
    }),
    prisma.clientPayment.count({ where }),
    prisma.clientPayment.aggregate({ _sum: { amount: true }, where }),
  ]);

  return {
    rows,
    total,
    totalAmount: sum._sum.amount,
    page: Math.max(1, input.page),
    pageSize: RECORDS_PAGE_SIZE,
  };
}

export async function searchExpenses(input: RecordFilterInput) {
  const where: Prisma.CompanyExpenseWhereInput = {
    ...(dateRange(input.from, input.to)
      ? { expenseDate: dateRange(input.from, input.to) }
      : {}),
    ...(input.extra?.category
      ? {
          category: input.extra
            .category as Prisma.EnumExpenseCategoryFilter["equals"],
        }
      : {}),
    ...(input.q
      ? { description: { contains: input.q, mode: "insensitive" } }
      : {}),
  };

  const [rows, total, sum] = await Promise.all([
    prisma.companyExpense.findMany({
      where,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      skip: offsetFor(input.page),
      take: RECORDS_PAGE_SIZE,
      include: { ...enteredBy },
    }),
    prisma.companyExpense.count({ where }),
    prisma.companyExpense.aggregate({ _sum: { amount: true }, where }),
  ]);

  return {
    rows,
    total,
    totalAmount: sum._sum.amount,
    page: Math.max(1, input.page),
    pageSize: RECORDS_PAGE_SIZE,
  };
}
