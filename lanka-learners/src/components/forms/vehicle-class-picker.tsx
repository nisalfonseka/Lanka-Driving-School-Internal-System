"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type VehicleClassOption = {
  id: string;
  code: string;
  name: string;
};

/**
 * Multi-select for vehicle classes. Selections are always stored as separate
 * rows in the database — never as a comma-separated string.
 */
export function VehicleClassPicker({
  options,
  selected,
  onChange,
  disabled,
  idPrefix = "vc",
}: {
  options: VehicleClassOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        No active vehicle classes are configured. An owner can add them under
        System Settings.
      </p>
    );
  }

  function toggle(id: string, checked: boolean) {
    onChange(
      checked ? [...new Set([...selected, id])] : selected.filter((v) => v !== id)
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const checked = selected.includes(option.id);
        const inputId = `${idPrefix}-${option.id}`;

        return (
          <label
            key={option.id}
            htmlFor={inputId}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm transition-colors",
              checked
                ? "border-primary/40 bg-accent"
                : "hover:bg-muted/60",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <Checkbox
              id={inputId}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(next) => toggle(option.id, next === true)}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <Label
                htmlFor={inputId}
                className="cursor-pointer font-medium"
              >
                {option.code}
              </Label>
              <span className="block truncate text-xs text-muted-foreground">
                {option.name}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
