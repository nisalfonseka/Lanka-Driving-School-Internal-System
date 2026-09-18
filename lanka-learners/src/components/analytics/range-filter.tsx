"use client";

import { CalendarRangeIcon, LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ANALYTICS_PRESETS,
  type AnalyticsPreset,
} from "@/lib/analytics-range";
import { cn } from "@/lib/utils";

/**
 * Period selector for the analytics page. The selection lives in the URL, so
 * the server recomputes every figure for the chosen range.
 */
export function AnalyticsRangeFilter({
  preset,
  from,
  to,
  label,
}: {
  preset: AnalyticsPreset;
  from?: string;
  to?: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCustom, setShowCustom] = useState(preset === "custom");
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function navigate(params: Record<string, string>) {
    const query = new URLSearchParams(params).toString();
    startTransition(() => router.push(`/analytics?${query}`));
  }

  function selectPreset(value: AnalyticsPreset) {
    if (value === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    navigate({ range: value });
  }

  function applyCustom(event: React.FormEvent) {
    event.preventDefault();
    if (!customFrom && !customTo) return;
    navigate({
      range: "custom",
      ...(customFrom ? { from: customFrom } : {}),
      ...(customTo ? { to: customTo } : {}),
    });
  }

  const active = showCustom ? "custom" : preset;

  return (
    <div className="mb-6 space-y-3 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label="Analytics period"
          className="flex flex-wrap gap-1.5"
        >
          {ANALYTICS_PRESETS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active === option.value}
              onClick={() => selectPreset(option.value)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {option.value === "custom" ? (
                <CalendarRangeIcon className="size-3.5" />
              ) : null}
              {option.label}
            </button>
          ))}
        </div>

        <p className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {isPending ? <LoaderIcon className="size-3 animate-spin" /> : null}
          Showing: <span className="font-medium text-foreground">{label}</span>
        </p>
      </div>

      {showCustom ? (
        <form
          onSubmit={applyCustom}
          className="flex flex-wrap items-end gap-3 border-t pt-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="analytics-from" className="text-xs">
              From
            </Label>
            <Input
              id="analytics-from"
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="h-8 w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="analytics-to" className="text-xs">
              To
            </Label>
            <Input
              id="analytics-to"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(event) => setCustomTo(event.target.value)}
              className="h-8 w-40"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || (!customFrom && !customTo)}
          >
            Apply
          </Button>
        </form>
      ) : null}
    </div>
  );
}
