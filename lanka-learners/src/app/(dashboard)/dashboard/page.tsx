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
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const TILE_SURFACES = [
  "bg-[#B2182B] text-white",
  "bg-[#D1E5F0] text-[#010101]",
  "bg-[#D6604D] text-white",
  "bg-[#92C5DE] text-[#010101]",
  "bg-[#F4A582] text-[#010101]",
  "bg-[#4393C3] text-white",
  "bg-[#FDDBC7] text-[#010101]",
  "bg-[#2166AC] text-white",
] as const;

function OperationTile({ item, index }: { item: NavItem; index: number }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex min-h-40 w-full items-center gap-4 rounded-2xl px-5 py-5 shadow-md shadow-foreground/10 outline-none transition-[transform,box-shadow,filter] hover:-translate-y-1 hover:shadow-xl hover:brightness-105 focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-44 sm:px-6 xl:min-h-48 ${TILE_SURFACES[index % TILE_SURFACES.length]}`}
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-current ring-1 ring-white/20"
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 text-base font-semibold tracking-tight sm:text-lg">
        {item.label}
      </span>
      <ArrowUpRightIcon className="size-5 shrink-0 text-current/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-current" />
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

      <div
        className={cn(
          "space-y-10",
          !isOwner && "flex min-h-[calc(100dvh-12rem)] flex-col justify-center"
        )}
      >
        {navigationSections.map((section, sectionIndex) => (
          <section
            key={section.title ?? `section-${sectionIndex}`}
            className={cn(!isOwner && "w-full")}
          >
            {section.ownerOnly ? (
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-semibold tracking-tight">Management</h2>
                <SettingsIcon className="size-4 text-muted-foreground" />
              </div>
            ) : null}
            <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 xl:gap-7">
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
