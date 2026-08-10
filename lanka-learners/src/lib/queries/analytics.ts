import "server-only";

import { lastMonths, monthKey, monthsAgo } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";

const MONTHS = 12;

export type AnalyticsData = {
  registrations: { month: string; clients: number }[];
  finance: { month: string; revenue: number; expenses: number }[];
  expenseCategories: { category: string; amount: number }[];
  examStats: { result: string; count: number }[];
  trialStats: { result: string; count: number }[];
  vehicleClassStats: { code: string; clients: number }[];
  totals: {
    revenue: number;
    expenses: number;
    net: number;
  };
};

/**
 * Every figure here comes from the database. Rows are bucketed by month in
 * application code after a single indexed range query per dataset, which keeps
 * the work off the database and avoids raw SQL.
 */
export async function getAnalytics(): Promise<AnalyticsData> {
  const since = monthsAgo(MONTHS - 1);
  const buckets = lastMonths(MONTHS);

  const [
    clients,
    payments,
    expenses,
    expenseByCategory,
    examGroups,
    trialGroups,
    vehicleClassLinks,
    revenueTotal,
    expenseTotal,
  ] = await Promise.all([
    prisma.client.findMany({
      where: { registeredDate: { gte: since } },
      select: { registeredDate: true },
    }),
    prisma.clientPayment.findMany({
      where: { paymentDate: { gte: since } },
      select: { paymentDate: true, amount: true },
    }),
    prisma.companyExpense.findMany({
      where: { expenseDate: { gte: since } },
      select: { expenseDate: true, amount: true },
    }),
    prisma.companyExpense.groupBy({
      by: ["category"],
      _sum: { amount: true },
    }),
    prisma.writtenExam.groupBy({ by: ["result"], _count: { _all: true } }),
    prisma.trialExam.groupBy({ by: ["result"], _count: { _all: true } }),
    prisma.clientVehicleClass.findMany({
      select: { vehicleClass: { select: { code: true } } },
    }),
    prisma.clientPayment.aggregate({ _sum: { amount: true } }),
    prisma.companyExpense.aggregate({ _sum: { amount: true } }),
  ]);

  const registrationCounts = new Map(buckets.map((b) => [b.key, 0]));
  for (const client of clients) {
    const key = monthKey(client.registeredDate);
    if (registrationCounts.has(key)) {
      registrationCounts.set(key, (registrationCounts.get(key) ?? 0) + 1);
    }
  }

  const revenueByMonth = new Map(buckets.map((b) => [b.key, 0]));
  for (const payment of payments) {
    const key = monthKey(payment.paymentDate);
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(
        key,
        (revenueByMonth.get(key) ?? 0) + toNumber(payment.amount)
      );
    }
  }

  const expensesByMonth = new Map(buckets.map((b) => [b.key, 0]));
  for (const expense of expenses) {
    const key = monthKey(expense.expenseDate);
    if (expensesByMonth.has(key)) {
      expensesByMonth.set(
        key,
        (expensesByMonth.get(key) ?? 0) + toNumber(expense.amount)
      );
    }
  }

  const vehicleCounts = new Map<string, number>();
  for (const link of vehicleClassLinks) {
    const code = link.vehicleClass.code;
    vehicleCounts.set(code, (vehicleCounts.get(code) ?? 0) + 1);
  }

  const revenue = toNumber(revenueTotal._sum.amount);
  const expenseSum = toNumber(expenseTotal._sum.amount);

  return {
    registrations: buckets.map((bucket) => ({
      month: bucket.label,
      clients: registrationCounts.get(bucket.key) ?? 0,
    })),
    finance: buckets.map((bucket) => ({
      month: bucket.label,
      revenue: Math.round(revenueByMonth.get(bucket.key) ?? 0),
      expenses: Math.round(expensesByMonth.get(bucket.key) ?? 0),
    })),
    expenseCategories: expenseByCategory
      .map((row) => ({
        category: row.category,
        amount: toNumber(row._sum.amount),
      }))
      .filter((row) => row.amount > 0),
    examStats: examGroups.map((row) => ({
      result: row.result,
      count: row._count._all,
    })),
    trialStats: trialGroups.map((row) => ({
      result: row.result,
      count: row._count._all,
    })),
    vehicleClassStats: [...vehicleCounts.entries()]
      .map(([code, clientCount]) => ({ code, clients: clientCount }))
      .sort((a, b) => b.clients - a.clients),
    totals: {
      revenue,
      expenses: expenseSum,
      net: revenue - expenseSum,
    },
  };
}
