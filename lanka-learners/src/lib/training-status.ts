import { humanise } from "@/lib/format";
import { compareClassCodes } from "@/lib/vehicle-classes";

/** A training day counts as completed when any of its classes was completed. */
export function countCompletedTrainingDays(
  days: { vehicleClasses: { status: string }[] }[]
): number {
  return days.filter((day) =>
    day.vehicleClasses.some((link) => link.status === "COMPLETED")
  ).length;
}

/**
 * Splits a requested set of classes into the links to drop and the class ids
 * to add. Classes that stay are left alone so their status is never reset.
 */
export function diffClassLinks<T extends { vehicleClassId: string }>(
  existing: T[],
  requestedIds: string[]
): { remove: T[]; add: string[] } {
  const requested = new Set(requestedIds);
  const present = new Set(existing.map((link) => link.vehicleClassId));

  return {
    remove: existing.filter((link) => !requested.has(link.vehicleClassId)),
    add: [...requested].filter((id) => !present.has(id)),
  };
}

/** "A: Completed", "B: Absent" — ordered by class code. */
export function summariseClassStatuses(
  links: { code: string; status: string }[]
): string[] {
  return [...links]
    .sort((a, b) => compareClassCodes(a.code, b.code))
    .map((link) => `${link.code}: ${humanise(link.status)}`);
}
