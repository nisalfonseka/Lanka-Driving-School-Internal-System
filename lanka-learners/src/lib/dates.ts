/**
 * All calendar-only values (exam dates, attendance dates, payment dates) are
 * stored at UTC midnight. Keeping this consistent means date-range filters and
 * "one attendance record per client per day" behave the same regardless of the
 * server's timezone.
 */

export function toUtcDateOnly(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  if (typeof value === "string") {
    // "YYYY-MM-DD" from a date input — take the parts verbatim.
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) {
      return new Date(
        Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      );
    }
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/** Inclusive end of day, for `lte` range filters. */
export function endOfUtcDay(value: Date | string): Date {
  const start = toUtcDateOnly(value);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function startOfMonth(reference = new Date()): Date {
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1)
  );
}

export function startOfNextMonth(reference = new Date()): Date {
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1)
  );
}

/** Start of the month `count` months before `reference`. */
export function monthsAgo(count: number, reference = new Date()): Date {
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - count, 1)
  );
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

/** Ordered [{ key, label }] buckets for the last `count` months, oldest first. */
export function lastMonths(count: number): { key: string; label: string }[] {
  const buckets: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = monthsAgo(i);
    buckets.push({ key: monthKey(date), label: monthLabel(date) });
  }
  return buckets;
}
