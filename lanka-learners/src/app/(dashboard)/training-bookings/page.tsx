import { CoffeeIcon, PhoneIcon, UtensilsIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { BookingDateFilter } from "@/components/training-bookings/booking-date-filter";
import { BookingDialog } from "@/components/training-bookings/booking-dialog";
import { BookingEditDialog } from "@/components/training-bookings/booking-edit-dialog";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import {
  SEATS_PER_SLOT,
  TIMETABLE,
  TOTAL_SEATS_PER_DAY,
  type BookingSlot,
} from "@/lib/booking-slots";
import { sriLankaToday } from "@/lib/dates";
import { canEditRecords } from "@/lib/permissions";
import { getBookingsForDay } from "@/lib/queries/training-bookings";
import { flattenSearchParams, readDate } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Training Booking" };

const DAY_HEADING = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

type Booking = Awaited<ReturnType<typeof getBookingsForDay>>[number];

export default async function TrainingBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Everyone can book and mark attendance; only owners may change or cancel.
  const canEditDetails = canEditRecords(user.role);

  const params = flattenSearchParams(await searchParams);
  const today = sriLankaToday().toISOString().slice(0, 10);
  const date = readDate(params.date) ?? today;

  const bookings = await getBookingsForDay(date);

  const bySlot = new Map<BookingSlot, (Booking | undefined)[]>();
  for (const booking of bookings) {
    const seats = bySlot.get(booking.slot) ?? [];
    seats[booking.seat - 1] = booking;
    bySlot.set(booking.slot, seats);
  }

  const present = bookings.filter((row) => row.attendance === "PRESENT").length;
  const absent = bookings.filter((row) => row.attendance === "ABSENT").length;
  const heading = DAY_HEADING.format(new Date(`${date}T00:00:00Z`));

  return (
    <>
      <PageHeader
        title="Training Booking"
        description="Daily timetable of training slots. Each slot takes up to two people."
        actions={<BookingDialog defaultDate={date} />}
      />

      <section className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Booked"
          value={`${bookings.length} / ${TOTAL_SEATS_PER_DAY}`}
        />
        <StatCard
          label="Available"
          value={TOTAL_SEATS_PER_DAY - bookings.length}
          tone="positive"
        />
        <StatCard label="Present" value={present} tone="positive" />
        <StatCard
          label="Absent"
          value={absent}
          tone={absent > 0 ? "warning" : "default"}
        />
      </section>

      <Card className="overflow-hidden p-0">
        <BookingDateFilter
          date={date}
          today={today}
          label={date === today ? `Today · ${heading}` : heading}
        />

        <div className="overflow-x-auto">
          <Table className="min-w-[720px] table-fixed">
            <colgroup>
              <col className="w-44" />
              <col />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Time Slot</TableHead>
                <TableHead>Booking 1</TableHead>
                <TableHead>Booking 2</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {TIMETABLE.map((row) => {
                if (row.kind === "break") {
                  const Icon = row.title.startsWith("Tea")
                    ? CoffeeIcon
                    : UtensilsIcon;
                  return (
                    <TableRow
                      key={row.label}
                      className="bg-muted/40 hover:bg-muted/40"
                    >
                      <TableCell className="pl-4 text-xs font-medium whitespace-nowrap text-muted-foreground tabular">
                        {row.label}
                      </TableCell>
                      <TableCell colSpan={SEATS_PER_SLOT}>
                        <span className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          <Icon className="size-3.5" />
                          {row.title}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                }

                const seats = bySlot.get(row.slot) ?? [];
                const bookedCount = seats.filter(Boolean).length;

                return (
                  <TableRow key={row.slot} className="hover:bg-transparent">
                    <TableCell className="pl-4 align-top">
                      <p className="font-medium whitespace-nowrap tabular">
                        {row.label}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-xs",
                          bookedCount === SEATS_PER_SLOT
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {bookedCount === SEATS_PER_SLOT
                          ? "Full"
                          : `${SEATS_PER_SLOT - bookedCount} of ${SEATS_PER_SLOT} free`}
                      </p>
                    </TableCell>

                    {Array.from({ length: SEATS_PER_SLOT }, (_, index) => {
                      const booking = seats[index];
                      return (
                        <TableCell key={index} className="align-top">
                          {booking ? (
                            <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
                              <div className="min-w-0 space-y-1">
                                <p className="truncate font-medium">
                                  {booking.name}
                                </p>
                                <a
                                  href={`tel:${booking.contactNumber.replace(/[\s-]/g, "")}`}
                                  className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular hover:text-foreground hover:underline"
                                >
                                  <PhoneIcon className="size-3" />
                                  {booking.contactNumber}
                                </a>
                                <div>
                                  <StatusBadge value={booking.attendance} />
                                </div>
                              </div>
                              <BookingEditDialog
                                canEditDetails={canEditDetails}
                                booking={{
                                  id: booking.id,
                                  bookingDate: date,
                                  slot: booking.slot,
                                  name: booking.name,
                                  contactNumber: booking.contactNumber,
                                  attendance: booking.attendance,
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex min-h-[86px] items-center justify-between gap-2 rounded-lg border border-dashed px-3 text-sm text-muted-foreground">
                              <span>Available</span>
                              <BookingDialog
                                defaultDate={date}
                                defaultSlot={row.slot}
                                variant="slot"
                              />
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}
