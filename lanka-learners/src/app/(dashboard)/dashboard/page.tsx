import {
  ArrowUpRightIcon,
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

import type { NavItem } from "@/components/layout/nav-config";
import { navSectionsFor } from "@/components/layout/nav-config";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format";
import {
  getDashboardStats,
  getOwnerDashboardStats,
} from "@/lib/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

const CARD_ACCENTS = [
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
] as const;

function WorkspaceCard({ item, index }: { item: NavItem; index: number }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group flex min-h-44 flex-col rounded-2xl bg-card p-5 shadow-sm shadow-foreground/[0.03] ring-1 ring-foreground/[0.07] outline-none transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/25 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex size-11 items-center justify-center rounded-xl ${CARD_ACCENTS[index % CARD_ACCENTS.length]}`}
        >
          <Icon className="size-5" />
        </span>
        <ArrowUpRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      </div>

      <div className="mt-auto pt-6">
        <h3 className="font-semibold tracking-tight">{item.label}</h3>
        <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
          {item.description}
        </p>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const isOwner = user.role === "OWNER";

  // Employees never receive the owner-only business performance figures.
  const ownerStats = isOwner ? await getOwnerDashboardStats() : null;
  const stats = ownerStats ?? (await getDashboardStats());
  const navigationSections = navSectionsFor(user.role).map((section) => ({
    ...section,
    items: section.items.filter((item) => item.href !== "/dashboard"),
  }));

  return (
    <>
      <div className="mb-8 rounded-2xl bg-card p-5 shadow-sm shadow-foreground/[0.03] ring-1 ring-foreground/[0.07] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {isOwner ? "Owner workspace" : "Employee workspace"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en-LK", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date())}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome back, {user.fullName.split(" ")[0]}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isOwner
                ? "Here is your school overview and everything you can manage today."
                : "Here is today’s overview and your day-to-day work areas."}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="lg" render={<Link href="/clients/new" />}>
              <UserPlusIcon className="size-4" />
              Register client
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/payments" />}
            >
              <BanknoteIcon className="size-4" />
              Add payment
            </Button>
          </div>
        </div>
      </div>

      <PageHeader
        title="At a glance"
        description="The latest numbers across your school."
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

      <div className="mt-10 space-y-10">
        {navigationSections.map((section, sectionIndex) => (
          <section key={section.title ?? `section-${sectionIndex}`}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight">
                {section.title ?? "Work areas"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.ownerOnly
                  ? "Owner-only tools for oversight and administration."
                  : "Choose an area to continue your daily work."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.items.map((item, itemIndex) => (
                <WorkspaceCard
                  key={item.href}
                  item={item}
                  index={sectionIndex * 2 + itemIndex}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {ownerStats ? (
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Business performance
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Long-term financial and examination performance.
            </p>
          </div>

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
                ownerStats.examPassRate === null
                  ? "—"
                  : `${ownerStats.examPassRate}%`
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
                ownerStats.trialPassRate === null
                  ? "—"
                  : `${ownerStats.trialPassRate}%`
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
