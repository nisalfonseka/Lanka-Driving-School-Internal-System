import "server-only";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/session";

/**
 * Uniform Server Action return shape. Actions never throw raw database errors
 * at the UI — they return a friendly message plus optional per-field errors.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string[]>
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

type PrismaKnownError = {
  code?: string;
  meta?: {
    /** Present on the Rust query engine. */
    target?: string[] | string;
    modelName?: string;
    /**
     * Prisma 7 driver adapters report the violation here instead of `target`.
     */
    driverAdapterError?: {
      cause?: {
        originalMessage?: string;
        constraint?: { fields?: string[]; index?: string };
      };
    };
  };
};

/**
 * Collects every hint about *which* column collided, across both the legacy
 * `meta.target` shape and the Prisma 7 driver-adapter shape.
 */
function uniqueViolationHint(error: PrismaKnownError): string {
  const meta = error.meta;
  const parts: string[] = [];

  if (Array.isArray(meta?.target)) parts.push(meta.target.join(","));
  else if (typeof meta?.target === "string") parts.push(meta.target);

  const cause = meta?.driverAdapterError?.cause;
  if (cause?.constraint?.fields) parts.push(cause.constraint.fields.join(","));
  if (cause?.constraint?.index) parts.push(cause.constraint.index);
  if (cause?.originalMessage) parts.push(cause.originalMessage);

  // Field names arrive quoted (e.g. "\"idNumber\"") from the adapter.
  return parts.join(" ").replace(/"/g, "").toLowerCase();
}

const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  idNumber: "A client with this NIC / ID number already exists.",
  admissionNumber: "This admission number is already in use.",
  billNumber: "This bill number has already been issued.",
  username: "This username is already taken.",
  email: "This email address is already registered.",
  code: "This code is already in use.",
};

/**
 * Wraps a Server Action body so authorization failures become clean messages
 * and unexpected database errors never leak their internals to the browser.
 */
export async function runAction<T>(
  body: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await body();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("Your session has expired. Please sign in again.");
    }
    if (error instanceof ForbiddenError) {
      return fail(error.message);
    }

    const prismaError = error as PrismaKnownError;

    if (prismaError?.code === "P2002") {
      const haystack = uniqueViolationHint(prismaError);
      const known = Object.keys(UNIQUE_FIELD_MESSAGES).find((field) =>
        haystack.includes(field.toLowerCase())
      );

      if (known) {
        return fail(UNIQUE_FIELD_MESSAGES[known], {
          [known]: [UNIQUE_FIELD_MESSAGES[known]],
        });
      }
      return fail("That record already exists.");
    }

    if (prismaError?.code === "P2025") {
      return fail("That record no longer exists.");
    }

    if (prismaError?.code === "P2003") {
      return fail("That record is referenced elsewhere and cannot be changed.");
    }

    console.error("[action] unexpected error", error);
    return fail("Something went wrong. Please try again.");
  }
}
