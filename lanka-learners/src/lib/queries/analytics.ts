import "server-only";

import {
  bucketKey,
  buildBuckets,
  sriLankaToday,
  type Granularity,
  type ResolvedRange,
} from "@/lib/analytics-range";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";

export type AnalyticsData = {
  granularity: Granularity;
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
    newClients: number;
  };
};

/**
 * Every figure here comes from the database and is limited to the selected
 * range. Rows are bucketed in application code after a single indexed range
 * query per dataset, which keeps the work off the database and avoids raw SQL.
 */
export function getAnalytics(range: ResolvedRange): Promise<AnalyticsData> {
  // Dates don't survive the cache's JSON round trip, so pass ISO strings.
  return getAnalyticsCached(range.start?.toISOString() ?? null, range.end.toISOString());
}

/**
 * Cached per date range. Any write that changes these figures expires the
 * "stats" tag, and the entry refreshes itself after five minutes regardless.
 */
const getAnalyticsCached = unstable_cache(
  async (startIso: string | null, endIso: string) =>
    computeAnalytics({
      start: startIso ? new Date(startIso) : undefined,
      end: new Date(endIso),
    }),
  ["analytics"],
  { tags: [CACHE_TAGS.stats], revalidate: 300 }
);

async function computeAnalytics(
  range: Pick<ResolvedRange, "start" | "end">
): Promise<AnalyticsData> {
  const within = {
    ...(range.start ? { gte: range.start } : {}),
    lt: range.end,
  };

  const [
    clients,
    payments,
    expenses,
    expenseByCategory,
    examGroups,
    trialGroups,
    vehicleClassLinks,
  ] = await Promise.all([
    prisma.client.findMany({
      where: { registeredDate: within },
      select: { registeredDate: true },
    }),
    prisma.clientPayment.findMany({
      where: { paymentDate: within },
      select: { paymentDate: true, amount: true },
    }),
    prisma.companyExpense.findMany({
      where: { expenseDate: within },
      select: { expenseDate: true, amount: true },
    }),
    prisma.companyExpense.groupBy({
      by: ["category"],
      where: { expenseDate: within },
      _sum: { amount: true },
    }),
    prisma.writtenExam.groupBy({
      by: ["result"],
      where: { examDate: within },
      _count: { _all: true },
    }),
    prisma.trialExam.groupBy({
      by: ["result"],
      where: { trialDate: within },
      _count: { _all: true },
    }),
    prisma.clientVehicleClass.findMany({
      where: { client: { registeredDate: within } },
      select: { vehicleClass: { select: { code: true } } },
    }),
  ]);

  // Lifetime starts at the earliest record actually present.
  let chartStart = range.start;
  if (!chartStart) {
    const dates = [
      ...clients.map((row) => row.registeredDate),
      ...payments.map((row) => row.paymentDate),
      ...expenses.map((row) => row.expenseDate),
    ];
    chartStart = dates.length
      ? new Date(Math.min(...dates.map((date) => date.getTime())))
      : sriLankaToday();
  }

  const { granularity, buckets } = buildBuckets(chartStart, range.end);
  const keyOf = (date: Date) => bucketKey(date, granularity);

  const registrationCounts = new Map(buckets.map((b) => [b.key, 0]));
  for (const client of clients) {
    const key = keyOf(client.registeredDate);
    if (registrationCounts.has(key)) {
      registrationCounts.set(key, (registrationCounts.get(key) ?? 0) + 1);
    }
  }

  const revenueByMonth = new Map(buckets.map((b) => [b.key, 0]));
  for (const payment of payments) {
    const key = keyOf(payment.paymentDate);
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(
        key,
        (revenueByMonth.get(key) ?? 0) + toNumber(payment.amount)
      );
    }
  }

  const expensesByMonth = new Map(buckets.map((b) => [b.key, 0]));
  for (const expense of expenses) {
    const key = keyOf(expense.expenseDate);
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

  const revenue = payments.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const expenseSum = expenses.reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );

  return {
    granularity,
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
      newClients: clients.length,
    },
  };
}
