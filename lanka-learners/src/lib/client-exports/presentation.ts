import { compareClassCodes } from "@/lib/vehicle-classes";

import type { ClientExportSnapshot, ExportTraining } from "./types";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const MONEY_FORMAT = new Intl.NumberFormat("en-LK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function exportDate(value: string | null | undefined): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not provided" : DATE_FORMAT.format(date);
}

export function exportMoney(value: string | number): string {
  const amount = Number(value);
  return `Rs. ${MONEY_FORMAT.format(Number.isFinite(amount) ? amount : 0)}`;
}

export function exportEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function valueOrMissing(value: string | null | undefined): string {
  return value?.trim() || "Not provided";
}

export function ageAtSnapshot(dateOfBirth: string, capturedAt: string): number | null {
  const dob = new Date(dateOfBirth);
  const at = new Date(capturedAt);
  if (Number.isNaN(dob.getTime()) || Number.isNaN(at.getTime())) return null;

  let age = at.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = at.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && at.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function clientFinancials(client: ClientExportSnapshot) {
  const agreed = Number(client.totalAgreedFee) || 0;
  const paid = client.payments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  );
  return { agreed, paid, remaining: agreed - paid };
}

export function classList(classes: { code: string; name: string }[]): string {
  return classes.length === 0
    ? "Not provided"
    : classes.map((item) => `${item.code} - ${item.name}`).join(", ");
}

/** Per-class statuses of a training day: newer snapshots only. */
function classStatuses(record: ExportTraining): { code: string; status: string }[] {
  return record.vehicleClasses.flatMap((item) =>
    item.status ? [{ code: item.code, status: item.status }] : []
  );
}

/**
 * Snapshots are stored as captured, so this reads both shapes: a status per
 * class (newer) or one status for the whole day (older).
 */
function trainingStatuses(record: ExportTraining): string[] {
  const perClass = classStatuses(record).map((item) => item.status);
  if (perClass.length > 0) return perClass;
  return record.status ? [record.status] : [];
}

/** Training days on which at least one class had this status. */
export function countTrainingsWithStatus(
  records: ExportTraining[],
  status: string
): number {
  return records.filter((record) => trainingStatuses(record).includes(status))
    .length;
}

/** "A: Absent, B: Completed" for a newer snapshot, "Completed" for an older one. */
export function trainingStatusText(record: ExportTraining): string {
  const perClass = classStatuses(record);
  if (perClass.length > 0) {
    return [...perClass]
      .sort((a, b) => compareClassCodes(a.code, b.code))
      .map((item) => `${item.code}: ${exportEnum(item.status)}`)
      .join(", ");
  }
  return record.status ? exportEnum(record.status) : "Not provided";
}

