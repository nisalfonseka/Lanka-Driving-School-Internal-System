import type { Metadata } from "next";

import {
  ExpenseCategoryChart,
  FinanceChart,
  RegistrationsChart,
  ResultChart,
  VehicleClassChart,
} from "@/components/analytics/lazy-charts";
import { AnalyticsRangeFilter } from "@/components/analytics/range-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveAnalyticsRange } from "@/lib/analytics-range";
import { requireOwnerPage } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format";
import { getAnalytics } from "@/lib/queries/analytics";
import { flattenSearchParams, readDate } from "@/lib/search-params";

export const metadata: Metadata = { title: "Analytics" };

const BUCKET_WORD = { day: "Daily", month: "Monthly", year: "Yearly" } as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Owner only — an employee reaching this URL is redirected by the guard.
  await requireOwnerPage();

  const params = flattenSearchParams(await searchParams);
  const from = readDate(params.from);
  const to = readDate(params.to);
  const range = resolveAnalyticsRange({ range: params.range, from, to });

  const analytics = await getAnalytics(range);
  const per = BUCKET_WORD[analytics.granularity];

  const hasExams = analytics.examStats.some((row) => row.count > 0);
  const hasTrials = analytics.trialStats.some((row) => row.count > 0);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Business performance for the selected period."
      />

      <AnalyticsRangeFilter
        // Remount when the URL changes so the custom inputs reflect it.
        key={`${range.preset}-${from ?? ""}-${to ?? ""}`}
        preset={range.preset}
        from={from}
        to={to}
        label={range.label}
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(analytics.totals.revenue)}
          tone="positive"
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(analytics.totals.expenses)}
        />
        <StatCard
          label="Net Income"
          value={formatCurrency(analytics.totals.net)}
          tone={analytics.totals.net >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="New Clients"
          value={analytics.totals.newClients.toLocaleString("en-LK")}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>{per} totals for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <FinanceChart data={analytics.finance} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Registrations</CardTitle>
            <CardDescription>{per} new client registrations.</CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationsChart data={analytics.registrations} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Where the money goes.</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.expenseCategories.length === 0 ? (
              <EmptyState title="No expenses in this period" />
            ) : (
              <ExpenseCategoryChart data={analytics.expenseCategories} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Written Exam Results</CardTitle>
            <CardDescription>Exams held in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasExams ? (
              <ResultChart data={analytics.examStats} />
            ) : (
              <EmptyState title="No exams in this period" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practical Trial Results</CardTitle>
            <CardDescription>Trials held in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTrials ? (
              <ResultChart data={analytics.trialStats} />
            ) : (
              <EmptyState title="No trials in this period" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Clients per Vehicle Class</CardTitle>
            <CardDescription>
              Learners registered in this period, by class.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.vehicleClassStats.length === 0 ? (
              <EmptyState title="No registrations in this period" />
            ) : (
              <VehicleClassChart data={analytics.vehicleClassStats} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
