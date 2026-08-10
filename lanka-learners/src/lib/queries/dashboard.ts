import "server-only";

import { startOfMonth, startOfNextMonth } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";

export type DashboardStats = {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  paymentsThisMonth: number;
  expensesThisMonth: number;
  outstandingPayments: number;
};

export type OwnerDashboardStats = DashboardStats & {
  revenueAllTime: number;
  expensesAllTime: number;
  netIncome: number;
  examPassRate: number | null;
  trialPassRate: number | null;
  examsDecided: number;
  trialsDecided: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const monthStart = startOfMonth();
  const monthEnd = startOfNextMonth();

  const [
    totalClients,
    activeClients,
    newClientsThisMonth,
    paymentsThisMonth,
    expensesThisMonth,
    agreedFees,
    paidTotal,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.client.count({
      where: { registeredDate: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.clientPayment.aggregate({
      _sum: { amount: true },
      where: { paymentDate: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.companyExpense.aggregate({
      _sum: { amount: true },
      where: { expenseDate: { gte: monthStart, lt: monthEnd } },
    }),
    // Cancelled learners are excluded from what the school still expects to collect.
    prisma.client.aggregate({
      _sum: { totalAgreedFee: true },
      where: { status: { not: "INACTIVE" } },
    }),
    prisma.clientPayment.aggregate({
      _sum: { amount: true },
      where: { client: { status: { not: "INACTIVE" } } },
    }),
  ]);

  const outstanding =
    toNumber(agreedFees._sum.totalAgreedFee) - toNumber(paidTotal._sum.amount);

  return {
    totalClients,
    activeClients,
    newClientsThisMonth,
    paymentsThisMonth: toNumber(paymentsThisMonth._sum.amount),
    expensesThisMonth: toNumber(expensesThisMonth._sum.amount),
    outstandingPayments: Math.max(0, outstanding),
  };
}

export async function getOwnerDashboardStats(): Promise<OwnerDashboardStats> {
  const base = await getDashboardStats();

  const [revenue, expenses, examCounts, trialCounts] = await Promise.all([
    prisma.clientPayment.aggregate({ _sum: { amount: true } }),
    prisma.companyExpense.aggregate({ _sum: { amount: true } }),
    prisma.writtenExam.groupBy({ by: ["result"], _count: { _all: true } }),
    prisma.trialExam.groupBy({ by: ["result"], _count: { _all: true } }),
  ]);

  // Pass rate is measured against decided attempts only — pending sittings
  // would otherwise drag the rate down for no reason.
  const examPass =
    examCounts.find((row) => row.result === "PASS")?._count._all ?? 0;
  const examDecided = examCounts
    .filter((row) => row.result === "PASS" || row.result === "FAIL")
    .reduce((sum, row) => sum + row._count._all, 0);

  const trialPass =
    trialCounts.find((row) => row.result === "PASS")?._count._all ?? 0;
  const trialDecided = trialCounts
    .filter((row) => row.result === "PASS" || row.result === "FAIL")
    .reduce((sum, row) => sum + row._count._all, 0);

  const revenueAllTime = toNumber(revenue._sum.amount);
  const expensesAllTime = toNumber(expenses._sum.amount);

  return {
    ...base,
    revenueAllTime,
    expensesAllTime,
    netIncome: revenueAllTime - expensesAllTime,
    examPassRate:
      examDecided > 0 ? Math.round((examPass / examDecided) * 100) : null,
    trialPassRate:
      trialDecided > 0 ? Math.round((trialPass / trialDecided) * 100) : null,
    examsDecided: examDecided,
    trialsDecided: trialDecided,
  };
}
