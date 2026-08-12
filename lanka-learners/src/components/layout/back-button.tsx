"use client";

import { ArrowLeftIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/dashboard") return null;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Go back"
      title="Go back"
      onClick={() => router.back()}
      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      <ArrowLeftIcon className="size-4" />
    </Button>
  );
}
