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
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        active &&
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
      )}
      render={<Link href="/dashboard" aria-current={active ? "page" : undefined} />}
    >
      <LayoutGridIcon className="size-4" />
      <span className="hidden sm:inline">Dashboard</span>
    </Button>
  );
}
