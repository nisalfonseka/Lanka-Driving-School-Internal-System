import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  return (
    <Card className="min-h-32 bg-card shadow-sm shadow-foreground/[0.03] ring-1 ring-foreground/[0.07]">
      <CardContent className="flex flex-1 items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p
            className={cn(
              "tabular mt-1.5 text-2xl font-semibold tracking-tight",
              tone === "positive" && "text-emerald-600 dark:text-emerald-400",
              tone === "negative" && "text-destructive",
              tone === "warning" && "text-amber-600 dark:text-amber-400"
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
          ) : null}
        </div>

        {Icon ? (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary",
              tone === "positive" &&
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              tone === "negative" && "bg-destructive/10 text-destructive",
              tone === "warning" &&
                "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
