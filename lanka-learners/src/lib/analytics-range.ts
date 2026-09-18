/**
 * Date ranges for the analytics page. Pure functions — safe on server and
 * client. Calendar dates are stored at UTC midnight, so every boundary here is
 * a UTC-midnight Date representing a Sri Lankan calendar day.
 */

import { sriLankaToday } from "@/lib/dates";

export { sriLankaToday };

export const ANALYTICS_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "3months", label: "Last 3 months" },
  { value: "year", label: "Last 1 year" },
  { value: "lifetime", label: "Lifetime" },
  { value: "custom", label: "Date range" },
] as const;

export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number]["value"];

export const DEFAULT_ANALYTICS_PRESET: AnalyticsPreset = "year";

export type ResolvedRange = {
  preset: AnalyticsPreset;
  /** Inclusive start; undefined means "from the beginning". */
  start?: Date;
  /** Exclusive end. */
  end: Date;
  /** Human description, e.g. "1 Sep 2026 – 18 Sep 2026". */
  label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function parseDay(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function describe(start: Date | undefined, endExclusive: Date): string {
  const last = addDays(endExclusive, -1);
  if (!start) return `All time up to ${DAY_LABEL.format(last)}`;
  if (start.getTime() === last.getTime()) return DAY_LABEL.format(start);
  return `${DAY_LABEL.format(start)} – ${DAY_LABEL.format(last)}`;
}

export function resolveAnalyticsRange(input: {
  range?: string;
  from?: string;
  to?: string;
  now?: Date;
}): ResolvedRange {
  const today = sriLankaToday(input.now);
  const tomorrow = addDays(today, 1);

  const preset = (ANALYTICS_PRESETS.some((p) => p.value === input.range)
    ? input.range
    : DEFAULT_ANALYTICS_PRESET) as AnalyticsPreset;

  let start: Date | undefined;
  let end = tomorrow;

  switch (preset) {
    case "today":
      start = today;
      break;
    case "yesterday":
      start = addDays(today, -1);
      end = today;
      break;
    case "week": {
      // Weeks start on Monday.
      const weekday = (today.getUTCDay() + 6) % 7;
      start = addDays(today, -weekday);
      break;
    }
    case "month":
      start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      break;
    case "3months":
      start = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2, 1)
      );
      break;
    case "year":
      start = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1)
      );
      break;
    case "lifetime":
      start = undefined;
      break;
    case "custom": {
      let from = parseDay(input.from);
      let to = parseDay(input.to);
      if (from && to && from > to) [from, to] = [to, from];
      start = from ?? to ?? today;
      end = addDays(to ?? from ?? today, 1);
      break;
    }
  }

  return { preset, start, end, label: describe(start, end) };
}

export type Bucket = { key: string; label: string };
export type Granularity = "day" | "month" | "year";

const DAY_BUCKET_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const MONTH_BUCKET_LABEL = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

export function bucketKey(date: Date, granularity: Granularity): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  if (granularity === "year") return `${y}`;
  if (granularity === "month") return `${y}-${m}`;
  return `${y}-${m}-${d}`;
}

/**
 * Chart buckets covering [start, end). Short ranges are shown per day, longer
 * ones per month, and anything over three years per year.
 */
export function buildBuckets(
  start: Date,
  end: Date
): { granularity: Granularity; buckets: Bucket[] } {
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));
  const granularity: Granularity =
    days <= 62 ? "day" : days <= 3 * 366 ? "month" : "year";

  const buckets: Bucket[] = [];
  if (granularity === "day") {
    for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) {
      buckets.push({
        key: bucketKey(cursor, "day"),
        label: DAY_BUCKET_LABEL.format(cursor),
      });
    }
  } else if (granularity === "month") {
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cursor < end) {
      buckets.push({
        key: bucketKey(cursor, "month"),
        label: MONTH_BUCKET_LABEL.format(cursor),
      });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
  } else {
    for (let year = start.getUTCFullYear(); year <= addDays(end, -1).getUTCFullYear(); year += 1) {
      buckets.push({ key: `${year}`, label: `${year}` });
    }
  }

  return { granularity, buckets };
}
