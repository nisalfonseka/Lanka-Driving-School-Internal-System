import { sriLankaToday, toUtcDateOnly } from "@/lib/dates";

const DAY_MS = 24 * 60 * 60 * 1000;

export const EXPORT_WEEKS_PER_PAGE = 12;

/** Monday at UTC midnight for the Sri Lankan calendar week containing `now`. */
export function currentExportWeekStart(now = new Date()): Date {
  const today = sriLankaToday(now);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  return new Date(today.getTime() - daysSinceMonday * DAY_MS);
}

export function exportWeekStart(value: Date | string): Date {
  const date = toUtcDateOnly(value);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - daysSinceMonday * DAY_MS);
}

export function exportWeekEnd(weekStart: Date): Date {
  return new Date(weekStart.getTime() + 6 * DAY_MS);
}

export function exportWeekKey(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}

export function exportWeekLabel(weekStart: Date): string {
  const end = exportWeekEnd(weekStart);
  const startLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(end);
  return `${startLabel} - ${endLabel}`;
}

export function parseExportWeekKey(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = toUtcDateOnly(value);
  if (exportWeekKey(date) !== value || date.getUTCDay() !== 1) return null;
  if (date > currentExportWeekStart()) return null;
  return date;
}

export function weeksBetweenInclusive(oldest: Date, newest: Date): number {
  return Math.floor((newest.getTime() - oldest.getTime()) / (7 * DAY_MS)) + 1;
}

export function exportWeekPage(page: number): Date[] {
  const current = currentExportWeekStart();
  const firstOffset = (page - 1) * EXPORT_WEEKS_PER_PAGE;
  return Array.from({ length: EXPORT_WEEKS_PER_PAGE }, (_, index) =>
    new Date(current.getTime() - (firstOffset + index) * 7 * DAY_MS)
  );
}

