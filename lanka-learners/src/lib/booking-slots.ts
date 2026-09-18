/**
 * The fixed daily timetable for training bookings. Shared by server and client.
 * Breaks are part of the timetable (so the day view shows them) but are never
 * bookable.
 */

export const SEATS_PER_SLOT = 2;

export const BOOKING_SLOTS = [
  "SLOT_0800",
  "SLOT_0900",
  "SLOT_1000",
  "SLOT_1130",
  "SLOT_1230",
  "SLOT_1400",
  "SLOT_1500",
  "SLOT_1600",
] as const;

export type BookingSlot = (typeof BOOKING_SLOTS)[number];

export type TimetableRow =
  | { kind: "slot"; slot: BookingSlot; label: string }
  | { kind: "break"; label: string; title: string };

export const TIMETABLE: TimetableRow[] = [
  { kind: "slot", slot: "SLOT_0800", label: "8:00 – 9:00 AM" },
  { kind: "slot", slot: "SLOT_0900", label: "9:00 – 10:00 AM" },
  { kind: "slot", slot: "SLOT_1000", label: "10:00 – 11:00 AM" },
  { kind: "break", label: "11:00 – 11:30 AM", title: "Tea break" },
  { kind: "slot", slot: "SLOT_1130", label: "11:30 AM – 12:30 PM" },
  { kind: "slot", slot: "SLOT_1230", label: "12:30 – 1:30 PM" },
  { kind: "break", label: "1:30 – 2:00 PM", title: "Lunch break" },
  { kind: "slot", slot: "SLOT_1400", label: "2:00 – 3:00 PM" },
  { kind: "slot", slot: "SLOT_1500", label: "3:00 – 4:00 PM" },
  { kind: "slot", slot: "SLOT_1600", label: "4:00 – 5:00 PM" },
];

export const SLOT_LABELS = Object.fromEntries(
  TIMETABLE.flatMap((row) => (row.kind === "slot" ? [[row.slot, row.label]] : []))
) as Record<BookingSlot, string>;

export const TOTAL_SEATS_PER_DAY = BOOKING_SLOTS.length * SEATS_PER_SLOT;
