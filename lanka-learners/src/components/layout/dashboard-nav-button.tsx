"use client";

import { LayoutGridIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardNavButton() {
  const pathname = usePathname();
  const active = pathname === "/dashboard";

  return (
    <Button
      variant="ghost"
      className={cn(
        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        active &&
          "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary/90"
      )}
      render={<Link href="/dashboard" aria-current={active ? "page" : undefined} />}
    >
      <LayoutGridIcon className="size-4" />
      <span className="hidden sm:inline">Dashboard</span>
    </Button>
  );
}
