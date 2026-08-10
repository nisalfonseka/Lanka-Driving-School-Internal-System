import {
  BanknoteIcon,
  ClipboardListIcon,
  ReceiptIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format";
import {
  getDashboardStats,
  getOwnerDashboardStats,
} from "@/lib/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const isOwner = user.role === "OWNER";

  // Employees never receive the financial figures they are not permitted to see.
  const ownerStats = isOwner ? await getOwnerDashboardStats() : null;
  const stats = ownerStats ?? (await getDashboardStats());

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.fullName.split(" ")[0]}`}
        description={
          isOwner
            ? "Business overview across clients, training and finance."
            : "Your daily operations overview."
        }
        actions={
          <>
            <Button render={<Link href="/clients/new" />}>
              <UserPlusIcon className="size-4" />
              Register Client
            </Button>
            <Button variant="outline" render={<Link href="/payments" />}>
              <BanknoteIcon className="size-4" />
              Add Payment
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Clients"
          value={stats.totalClients}
          icon={UsersIcon}
        />
        <StatCard
          label="Active Clients"
          value={stats.activeClients}
          icon={UsersIcon}
        />
        <StatCard
          label="New This Month"
          value={stats.newClientsThisMonth}
          icon={UserPlusIcon}
        />
        <StatCard
          label="Payments This Month"
          value={formatCurrency(stats.paymentsThisMonth)}
          icon={BanknoteIcon}
          tone="positive"
        />
        <StatCard
          label="Expenses This Month"
          value={formatCurrency(stats.expensesThisMonth)}
          icon={ReceiptIcon}
        />
        <StatCard
          label="Outstanding Payments"
          value={formatCurrency(stats.outstandingPayments)}
          hint="Agreed fees not yet collected"
          icon={WalletIcon}
          tone={stats.outstandingPayments > 0 ? "warning" : "default"}
        />
      </section>

      {ownerStats ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Business performance
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Revenue (All Time)"
              value={formatCurrency(ownerStats.revenueAllTime)}
              icon={TrendingUpIcon}
              tone="positive"
            />
            <StatCard
              label="Expenses (All Time)"
              value={formatCurrency(ownerStats.expensesAllTime)}
              icon={ReceiptIcon}
            />
            <StatCard
              label="Net Income"
              value={formatCurrency(ownerStats.netIncome)}
              icon={WalletIcon}
              tone={ownerStats.netIncome >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label="Exam Pass Rate"
              value={
                ownerStats.examPassRate === null ? "—" : `${ownerStats.examPassRate}%`
              }
              hint={
                ownerStats.examsDecided > 0
                  ? `${ownerStats.examsDecided} decided attempts`
                  : "No results recorded yet"
              }
              icon={ClipboardListIcon}
            />
            <StatCard
              label="Trial Pass Rate"
              value={
                ownerStats.trialPassRate === null ? "—" : `${ownerStats.trialPassRate}%`
              }
              hint={
                ownerStats.trialsDecided > 0
                  ? `${ownerStats.trialsDecided} decided attempts`
                  : "No results recorded yet"
              }
              icon={ClipboardListIcon}
            />
            <StatCard
              label="New Registrations"
              value={stats.newClientsThisMonth}
              hint="This month"
              icon={UserPlusIcon}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
