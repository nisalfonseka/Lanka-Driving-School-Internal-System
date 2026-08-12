import {
  ArrowUpRightIcon,
  BanknoteIcon,
  BarChart3Icon,
  ReceiptIcon,
  SettingsIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import type { NavItem } from "@/components/layout/nav-config";
import { navSectionsFor } from "@/components/layout/nav-config";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format";
import { getOwnerDashboardStats } from "@/lib/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

const TILE_ACCENTS = [
  "bg-[#2563eb]/12 text-[#1d4ed8] dark:bg-[#60a5fa]/15 dark:text-[#93c5fd]",
  "bg-[#7c3aed]/12 text-[#6d28d9] dark:bg-[#a78bfa]/15 dark:text-[#c4b5fd]",
  "bg-[#059669]/12 text-[#047857] dark:bg-[#34d399]/15 dark:text-[#6ee7b7]",
  "bg-[#d97706]/12 text-[#b45309] dark:bg-[#fbbf24]/15 dark:text-[#fcd34d]",
  "bg-[#dc2626]/12 text-[#b91c1c] dark:bg-[#f87171]/15 dark:text-[#fca5a5]",
  "bg-[#db2777]/12 text-[#be185d] dark:bg-[#f472b6]/15 dark:text-[#f9a8d4]",
  "bg-[#0891b2]/12 text-[#0e7490] dark:bg-[#22d3ee]/15 dark:text-[#67e8f9]",
  "bg-[#4f46e5]/12 text-[#4338ca] dark:bg-[#818cf8]/15 dark:text-[#a5b4fc]",
] as const;

function OperationTile({ item, index }: { item: NavItem; index: number }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group flex min-h-24 items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-sm shadow-foreground/[0.03] ring-1 ring-foreground/[0.07] outline-none transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/25 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${TILE_ACCENTS[index % TILE_ACCENTS.length]}`}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
        {item.label}
      </span>
      <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const isOwner = user.role === "OWNER";
  const ownerStats = isOwner ? await getOwnerDashboardStats() : null;
  const todayStats = ownerStats;
  const navigationSections = navSectionsFor(user.role).map((section) => ({
    ...section,
    items: section.items.filter((item) => item.href !== "/dashboard"),
  }));
  const todayLabel = new Intl.DateTimeFormat("en-LK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-8">
      {isOwner ? (
        <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Owner console
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{todayLabel}</span>
            <Button size="sm" render={<Link href="/clients/new" />}>
              <UserPlusIcon className="size-4" />
              Register client
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/payments" />}>
              <BanknoteIcon className="size-4" />
              Add payment
            </Button>
          </div>
        </div>
      ) : null}

      {isOwner ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Today&apos;s analytics
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live activity across the school today.
              </p>
            </div>
            <BarChart3Icon className="size-5 text-muted-foreground" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Active clients" value={todayStats!.activeClients} icon={UsersIcon} />
            <StatCard label="New today" value={todayStats!.todayNewClients} icon={UserPlusIcon} />
            <StatCard
              label="Payments today"
              value={formatCurrency(todayStats!.todayPayments)}
              icon={BanknoteIcon}
              tone="positive"
            />
            <StatCard
              label="Expenses today"
              value={formatCurrency(todayStats!.todayExpenses)}
              icon={ReceiptIcon}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(todayStats!.outstandingPayments)}
              icon={WalletIcon}
              tone={todayStats!.outstandingPayments > 0 ? "warning" : "default"}
            />
          </div>
        </section>
      ) : null}

      <div className="space-y-8">
        {navigationSections.map((section, sectionIndex) => (
          <section key={section.title ?? `section-${sectionIndex}`}>
            {section.ownerOnly ? (
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-semibold tracking-tight">Management</h2>
                <SettingsIcon className="size-4 text-muted-foreground" />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {section.items.map((item, itemIndex) => (
                <OperationTile
                  key={item.href}
                  item={item}
                  index={sectionIndex * 2 + itemIndex}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
