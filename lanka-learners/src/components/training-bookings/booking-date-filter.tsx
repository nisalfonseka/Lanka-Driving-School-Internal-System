"use client";

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function shiftDay(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Day picker for the bookings table. The chosen day lives in the URL. */
export function BookingDateFilter({
  date,
  today,
  label,
}: {
  date: string;
  today: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function go(next: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
    // Typing a year digit by digit yields "0002", "0020"… — wait for a real one.
    const year = Number(next.slice(0, 4));
    if (year < 2000 || year > 2100) return;
    startTransition(() => router.push(`/training-bookings?date=${next}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b p-4">
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day"
          onClick={() => go(shiftDay(date, -1))}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>

        <div className="relative">
          <CalendarIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            aria-label="Booking date"
            // Uncontrolled so partial typing isn't overwritten; remounts when
            // the URL (and so the selected day) changes.
            key={date}
            defaultValue={date}
            onChange={(event) => go(event.target.value)}
            className="w-44 pl-8"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          aria-label="Next day"
          onClick={() => go(shiftDay(date, 1))}
        >
          <ChevronRightIcon className="size-4" />
        </Button>

        <Button
          variant={date === today ? "secondary" : "outline"}
          onClick={() => go(today)}
          disabled={date === today}
        >
          Today
        </Button>
      </div>

      <p className="flex items-center gap-2 text-sm font-medium">
        {isPending ? (
          <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
        ) : null}
        {label}
      </p>
    </div>
  );
}
