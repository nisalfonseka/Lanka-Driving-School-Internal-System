"use client";

import {
  BanknoteIcon,
  CalendarPlusIcon,
  ReceiptIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import type { DashboardStats } from "@/lib/queries/dashboard";

export function TodaySummaryDialog({ stats }: { stats: DashboardStats }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          />
        }
      >
        <CalendarPlusIcon className="size-4" />
        Today&apos;s summary
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Today&apos;s summary</DialogTitle>
          <DialogDescription>
            A quick view of the school&apos;s activity today.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Active clients" value={stats.activeClients} icon={UsersIcon} />
          <StatCard label="New clients" value={stats.todayNewClients} icon={UsersIcon} />
          <StatCard
            label="Payments"
            value={formatCurrency(stats.todayPayments)}
            icon={BanknoteIcon}
            tone="positive"
          />
          <StatCard
            label="Expenses"
            value={formatCurrency(stats.todayExpenses)}
            icon={ReceiptIcon}
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(stats.outstandingPayments)}
            icon={WalletIcon}
            tone={stats.outstandingPayments > 0 ? "warning" : "default"}
          />
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
