import { z } from "zod";

/**
 * Shared field-level rules. These schemas are the *same objects* used by the
 * React Hook Form resolver and by the Server Action, so client-side validation
 * can never be more permissive than the server.
 */

/** Sri Lankan NIC: 9 digits + V/X (old) or 12 digits (new). */
export const nicSchema = z
  .string()
  .trim()
  .min(1, "NIC / ID number is required")
  .max(20, "NIC / ID number is too long")
  .refine(
    (value) => /^(\d{9}[VvXx]|\d{12})$/.test(value),
    "Enter a valid NIC (9 digits followed by V/X, or 12 digits)"
  )
  .transform((value) => value.toUpperCase());

/** Sri Lankan mobile: 0771234567, +94771234567 or 94771234567. */
export const mobileSchema = z
  .string()
  .trim()
  .refine(
    (value) => /^(?:\+94|94|0)?7\d{8}$/.test(value.replace(/[\s-]/g, "")),
    "Enter a valid mobile number (e.g. 0771234567)"
  );

export const optionalMobileSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      /^(?:\+94|94|0)?7\d{8}$/.test(value.replace(/[\s-]/g, "")),
    "Enter a valid mobile number (e.g. 0771234567)"
  );

export const admissionNumberSchema = z
  .string()
  .trim()
  .min(2, "Admission number is required")
  .max(30, "Admission number is too long")
  .regex(
    /^[A-Za-z0-9/-]+$/,
    "Admission number may only contain letters, numbers, / and -"
  )
  .transform((value) => value.toUpperCase());

/**
 * True only for a day that actually exists.
 *
 * `new Date("2000-02-31")` does *not* throw — JavaScript rolls it over to
 * 2 March — so a plain parse check would happily accept 31 February. Comparing
 * the parsed parts back against the input is what rejects it.
 */
function isRealCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** A `YYYY-MM-DD` date value. */
export const dateStringSchema = z
  .string()
  .trim()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a complete date")
  .refine(isRealCalendarDate, "That date does not exist");

export const optionalDateStringSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .refine(
    (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Enter a complete date"
  )
  .refine(
    (value) => value === undefined || isRealCalendarDate(value),
    "That date does not exist"
  );

/** Money: positive, at most 2 decimal places, capped below the Decimal(12,2) limit. */
export const amountSchema = z.coerce
  .number({ error: "Enter a valid amount" })
  .positive("Amount must be greater than zero")
  .max(9_999_999_999, "Amount is too large")
  .refine(
    (value) => Number.isInteger(Math.round(value * 100)),
    "Amount may have at most 2 decimal places"
  );

export const nonNegativeAmountSchema = z.coerce
  .number({ error: "Enter a valid amount" })
  .min(0, "Amount cannot be negative")
  .max(9_999_999_999, "Amount is too large");

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

export const cuidSchema = z.string().min(1, "Required");

/** At least one vehicle class must be selected. */
export const vehicleClassIdsSchema = z
  .array(cuidSchema)
  .min(1, "Select at least one vehicle class")
  .max(20, "Too many vehicle classes selected");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

/** Normalises a date range so `from` is never after `to`. */
export const dateRangeSchema = z
  .object({
    from: optionalDateStringSchema,
    to: optionalDateStringSchema,
  })
  .refine(
    (value) =>
      !value.from || !value.to || new Date(value.from) <= new Date(value.to),
    { message: "The start date must be before the end date", path: ["from"] }
  );
