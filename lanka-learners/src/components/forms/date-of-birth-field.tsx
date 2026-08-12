"use client";

import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Parts = { day: string; month: string; year: string };

function splitIsoDate(value: string | undefined): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return { day: "", month: "", year: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function joinParts({ day, month, year }: Parts): string {
  if (!day || !month || !year) return "";
  return `${year}-${month}-${day}`;
}

function daysInMonth(year: string, month: string): number {
  const monthNumber = Number(month);
  if (monthNumber < 1 || monthNumber > 12) return 31;

  // Until a full year is entered, February offers 29 days. Changing a year
  // later automatically removes an invalid 29 February selection.
  const yearNumber = /^\d{4}$/.test(year) ? Number(year) : 2000;
  return new Date(Date.UTC(yearNumber, monthNumber, 0)).getUTCDate();
}

function datePartsWithValidDay(next: Parts): Parts {
  const maxDay = daysInMonth(next.year, next.month);
  return Number(next.day) > maxDay ? { ...next, day: "" } : next;
}

const MONTHS = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, "0");
  return { value, label: value };
});

/**
 * A constrained year/month/day input. Month and day are selects rather than
 * free text, so staff cannot enter month 13, day 32, or 31 February.
 */
export function DateOfBirthField({
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
  idPrefix = "dob",
}: {
  /** `YYYY-MM-DD`, or an empty string when incomplete. */
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const [parts, setParts] = useState<Parts>(() => splitIsoDate(value));
  const [seenValue, setSeenValue] = useState(value);
  const monthRef = useRef<HTMLSelectElement>(null);

  // The parent receives an empty string until all three fields are complete.
  // Keep partial values locally, but accept complete values arriving from a
  // reset or an existing client record.
  if (value !== seenValue) {
    setSeenValue(value);
    const incoming = splitIsoDate(value);
    if (joinParts(incoming) !== joinParts(parts)) setParts(incoming);
  }

  function update(next: Parts) {
    const validParts = datePartsWithValidDay(next);
    setParts(validParts);
    onChange(joinParts(validParts));
  }

  function handleYear(raw: string) {
    const year = raw.replace(/\D/g, "").slice(0, 4);
    update({ ...parts, year });
    if (year.length === 4) monthRef.current?.focus();
  }

  const controlClass = "h-8 w-full rounded-lg border border-border bg-card px-2 text-center text-sm tabular outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
  const maxDay = daysInMonth(parts.year, parts.month);

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_4rem_4rem] items-center gap-2",
        disabled && "opacity-60"
      )}
      role="group"
      aria-label="Date of birth"
    >
      <Input
        id={`${idPrefix}-year`}
        inputMode="numeric"
        autoComplete="bday-year"
        placeholder="YYYY"
        maxLength={4}
        disabled={disabled}
        aria-label="Year"
        aria-invalid={invalid || undefined}
        className="tabular text-center"
        value={parts.year}
        onChange={(event) => handleYear(event.target.value)}
        onBlur={onBlur}
      />

      <select
        ref={monthRef}
        id={`${idPrefix}-month`}
        autoComplete="bday-month"
        disabled={disabled}
        aria-label="Month"
        aria-invalid={invalid || undefined}
        className={controlClass}
        value={parts.month}
        onChange={(event) => update({ ...parts, month: event.target.value })}
        onBlur={onBlur}
      >
        <option value="">MM</option>
        {MONTHS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>

      <select
        id={`${idPrefix}-day`}
        autoComplete="bday-day"
        disabled={disabled || !parts.month}
        aria-label="Day"
        aria-invalid={invalid || undefined}
        className={controlClass}
        value={parts.day}
        onChange={(event) => update({ ...parts, day: event.target.value })}
        onBlur={onBlur}
      >
        <option value="">DD</option>
        {Array.from({ length: maxDay }, (_, index) => {
          const day = String(index + 1).padStart(2, "0");
          return (
            <option key={day} value={day}>
              {day}
            </option>
          );
        })}
      </select>
    </div>
  );
}
