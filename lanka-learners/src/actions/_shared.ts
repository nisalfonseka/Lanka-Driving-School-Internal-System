import "server-only";

import { updateTag } from "next/cache";
import type { ZodError } from "zod";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";

/** True when every id is an existing, active vehicle class. */
export async function assertActiveVehicleClasses(
  ids: string[]
): Promise<boolean> {
  const count = await prisma.vehicleClass.count({
    where: { id: { in: ids }, status: "ACTIVE" },
  });
  return count === ids.length;
}

/** Flattens a Zod error into the `fieldErrors` shape used by ActionResult. */
export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/**
 * Expires cached query results after a write. `updateTag` makes the very next
 * request wait for fresh data, so the user always sees their own change.
 */
export function expireCache(
  ...tags: (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS][]
) {
  for (const tag of tags) updateTag(tag);
}
