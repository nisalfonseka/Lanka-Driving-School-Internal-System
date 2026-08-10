import type { Metadata } from "next";

import {
  ExpenseCategoryChart,
  FinanceChart,
  RegistrationsChart,
  ResultChart,
  VehicleClassChart,
} from "@/components/analytics/charts";
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
import { requireOwnerPage } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format";
import { getAnalytics } from "@/lib/queries/analytics";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  // Owner only — an employee reaching this URL is redirected by the guard.
  await requireOwnerPage();

  const analytics = await getAnalytics();

  const hasExams = analytics.examStats.some((row) => row.count > 0);
  const hasTrials = analytics.trialStats.some((row) => row.count > 0);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Business performance over the last 12 months."
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
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
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly totals, last 12 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <FinanceChart data={analytics.finance} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Registrations</CardTitle>
            <CardDescription>New clients per month.</CardDescription>
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
              <EmptyState title="No expenses recorded yet" />
            ) : (
              <ExpenseCategoryChart data={analytics.expenseCategories} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Written Exam Results</CardTitle>
            <CardDescription>All recorded attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasExams ? (
              <ResultChart data={analytics.examStats} />
            ) : (
              <EmptyState title="No exam results recorded yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practical Trial Results</CardTitle>
            <CardDescription>All recorded attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTrials ? (
              <ResultChart data={analytics.trialStats} />
            ) : (
              <EmptyState title="No trial results recorded yet" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Clients per Vehicle Class</CardTitle>
            <CardDescription>
              How many learners are registered for each class.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.vehicleClassStats.length === 0 ? (
              <EmptyState title="No vehicle classes assigned yet" />
            ) : (
              <VehicleClassChart data={analytics.vehicleClassStats} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
