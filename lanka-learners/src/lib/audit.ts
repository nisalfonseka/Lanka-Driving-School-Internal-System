import "server-only";

import { headers } from "next/headers";

import { prisma } from "@/lib/db";
import type { AuditAction } from "@/generated/prisma/enums";

type AuditInput = {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  description: string;
  oldData?: unknown;
  newData?: unknown;
};

/** Field names that must never reach the audit table. */
const REDACTED_KEYS = new Set([
  "password",
  "passwordHash",
  "newPassword",
  "confirmPassword",
  "temporaryPassword",
  "token",
]);

/**
 * Strips credentials out of anything on its way into `oldData` / `newData`.
 * Passwords must never be written to a log, hashed or otherwise.
 */
function sanitise(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) return value.map(sanitise);

  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    // Prisma Decimal and similar wrappers serialise cleanly via toString().
    if (typeof (value as { toFixed?: unknown }).toFixed === "function") {
      return String(value);
    }

    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (REDACTED_KEYS.has(key)) continue;
      result[key] = sanitise(nested);
    }
    return result;
  }

  return value;
}

/**
 * Appends an audit entry. Deliberately never throws: an auditing failure must
 * not roll back or mask the business operation the user just completed.
 */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() ||
      headerList.get("x-real-ip") ||
      null;
    const userAgent = headerList.get("user-agent");

    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        description: input.description,
        oldData:
          input.oldData === undefined
            ? undefined
            : (sanitise(input.oldData) as never),
        newData:
          input.newData === undefined
            ? undefined
            : (sanitise(input.newData) as never),
        ipAddress,
        userAgent: userAgent ? userAgent.slice(0, 512) : null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}
