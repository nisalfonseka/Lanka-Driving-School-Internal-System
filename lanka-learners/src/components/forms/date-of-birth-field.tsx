"use client";

import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Year / month / day entry as three boxes — matches the stored ISO date shape
 * and makes the expected ordering explicit for staff copying a date off
 * a paper form than a native date picker, while staying unambiguous about ordering.
 *
 * The component owns only the *shape* of the input. Whether the date is a real
 * calendar day, and whether it gives a plausible age, stays with the Zod schema
 * so the client and the server apply exactly the same rules: once all three
 * boxes are filled it emits `YYYY-MM-DD` (even if that day does not exist, e.g.
 * 31/02) and lets validation report the problem.
 */

type Parts = { day: string; month: string; year: string };

function splitIsoDate(value: string | undefined): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return { day: "", month: "", year: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function joinParts({ day, month, year }: Parts): string {
  if (!day || !month || !year) return "";
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const digitsOnly = (raw: string) => raw.replace(/\D/g, "");

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
  /*
    Local state holds the three boxes as text, because a half-typed date (a day
    with no year yet) cannot be represented in the parent's `YYYY-MM-DD` value.

    Re-syncing is done during render rather than in an effect: when the form
    resets or loads an existing client, the incoming value wins. An effect would
    render the stale value first and then immediately re-render.
  */
  const [parts, setParts] = useState<Parts>(() => splitIsoDate(value));
  const [seenValue, setSeenValue] = useState(value);

  if (value !== seenValue) {
    setSeenValue(value);
    const incoming = splitIsoDate(value);
    if (joinParts(incoming) !== joinParts(parts)) {
      setParts(incoming);
    }
  }

  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  function update(next: Parts) {
    setParts(next);
    onChange(joinParts(next));
  }

  function handlePart(
    key: keyof Parts,
    raw: string,
    maxLength: number,
    advanceTo?: React.RefObject<HTMLInputElement | null>
  ) {
    const cleaned = digitsOnly(raw).slice(0, maxLength);
    update({ ...parts, [key]: cleaned });

    // Jump to the next box as soon as this one is full, so a date can be typed
    // straight through without reaching for Tab.
    if (cleaned.length === maxLength && advanceTo?.current) {
      advanceTo.current.focus();
      advanceTo.current.select();
    }
  }

  /** Backspace in an empty box steps back to the previous one. */
  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    key: keyof Parts,
    previous?: React.RefObject<HTMLInputElement | null>
  ) {
    if (event.key === "Backspace" && parts[key] === "" && previous?.current) {
      event.preventDefault();
      previous.current.focus();
      const length = previous.current.value.length;
      previous.current.setSelectionRange(length, length);
    }
  }

  /** Pads 1-digit month/day on blur: "7" becomes "07". */
  function padOnBlur(key: "day" | "month") {
    if (parts[key].length === 1) {
      update({ ...parts, [key]: parts[key].padStart(2, "0") });
    }
    onBlur?.();
  }

  const boxClass = "tabular text-center";

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_3.25rem_3.25rem] items-center gap-2",
        disabled && "opacity-60"
      )}
      // One accessible group rather than three unrelated inputs. The invalid
      // state lives on the inputs themselves — `group` does not support it.
      role="group"
      aria-label="Date of birth"
    >
      <Input
        ref={yearRef}
        id={`${idPrefix}-year`}
        inputMode="numeric"
        autoComplete="bday-year"
        placeholder="YYYY"
        maxLength={4}
        disabled={disabled}
        aria-label="Year"
        aria-invalid={invalid || undefined}
        className={boxClass}
        value={parts.year}
        onChange={(event) => handlePart("year", event.target.value, 4, monthRef)}
        onKeyDown={(event) => handleKeyDown(event, "year")}
        onBlur={() => onBlur?.()}
      />

      <Input
        ref={monthRef}
        id={`${idPrefix}-month`}
        inputMode="numeric"
        autoComplete="bday-month"
        placeholder="MM"
        maxLength={2}
        disabled={disabled}
        aria-label="Month"
        aria-invalid={invalid || undefined}
        className={boxClass}
        value={parts.month}
        onChange={(event) =>
          handlePart("month", event.target.value, 2, dayRef)
        }
        onKeyDown={(event) => handleKeyDown(event, "month", yearRef)}
        onBlur={() => padOnBlur("month")}
      />

      <Input
        ref={dayRef}
        id={`${idPrefix}-day`}
        inputMode="numeric"
        autoComplete="bday-day"
        placeholder="DD"
        maxLength={2}
        disabled={disabled}
        aria-label="Day"
        aria-invalid={invalid || undefined}
        className={boxClass}
        value={parts.day}
        onChange={(event) => handlePart("day", event.target.value, 2)}
        onKeyDown={(event) => handleKeyDown(event, "day", monthRef)}
        onBlur={() => padOnBlur("day")}
      />
    </div>
  );
}
