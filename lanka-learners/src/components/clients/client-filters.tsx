"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "INACTIVE", label: "Inactive" },
];

/**
 * Filters are held in the URL so results are shareable, bookmarkable and
 * survive a refresh — and so the query runs on the server.
 */
export function ClientFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [values, setValues] = useState({
    q: searchParams.get("q") ?? "",
    idNumber: searchParams.get("idNumber") ?? "",
    admissionNumber: searchParams.get("admissionNumber") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    status: searchParams.get("status") ?? "",
  });

  const hasFilters = Object.values(values).some((value) => value !== "");

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value) query.set(key, value);
    }
    const queryString = query.toString();
    router.push(queryString ? `/clients?${queryString}` : "/clients");
  }

  function clear() {
    setValues({
      q: "",
      idNumber: "",
      admissionNumber: "",
      from: "",
      to: "",
      status: "",
    });
    router.push("/clients");
  }

  return (
    <form
      onSubmit={apply}
      className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-6 print:hidden"
    >
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="q" className="text-xs">
          Search
        </Label>
        <Input
          id="q"
          placeholder="Name, NIC, admission no…"
          value={values.q}
          onChange={(event) =>
            setValues((current) => ({ ...current, q: event.target.value }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="idNumber" className="text-xs">
          NIC / ID
        </Label>
        <Input
          id="idNumber"
          value={values.idNumber}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              idNumber: event.target.value,
            }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admissionNumber" className="text-xs">
          Admission No.
        </Label>
        <Input
          id="admissionNumber"
          value={values.admissionNumber}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              admissionNumber: event.target.value,
            }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="from" className="text-xs">
          From
        </Label>
        <Input
          id="from"
          type="date"
          value={values.from}
          onChange={(event) =>
            setValues((current) => ({ ...current, from: event.target.value }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="to" className="text-xs">
          To
        </Label>
        <Input
          id="to"
          type="date"
          value={values.to}
          onChange={(event) =>
            setValues((current) => ({ ...current, to: event.target.value }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status" className="text-xs">
          Status
        </Label>
        <SelectField
          id="status"
          value={values.status}
          onValueChange={(status) =>
            setValues((current) => ({ ...current, status }))
          }
          options={STATUS_OPTIONS}
          placeholder="All statuses"
        />
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
        <Button type="submit" size="sm">
          <SearchIcon className="size-4" />
          Search
        </Button>

        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <XIcon className="size-4" />
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}
