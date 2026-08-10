/** Flattens Next.js `searchParams` into a plain string record. */
export function flattenSearchParams(
  raw: Record<string, string | string[] | undefined>
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ])
  );
}

/** Reads a positive integer page number, defaulting to 1 on anything invalid. */
export function readPage(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/** Only allows values from a known set — never trust a query string. */
export function readEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[]
): T | undefined {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** Accepts only a YYYY-MM-DD date. */
export function readDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(new Date(value).getTime()) ? undefined : value;
}

export function readText(
  value: string | undefined,
  maxLength = 120
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed.slice(0, maxLength);
}
