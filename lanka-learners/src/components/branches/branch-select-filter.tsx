"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { SelectField } from "@/components/forms/select-field";
import { Label } from "@/components/ui/label";
import type { BranchOption } from "@/lib/branches";

export function BranchSelectFilter({
  branches,
  value,
  allowAll = true,
}: {
  branches: BranchOption[];
  value?: string;
  allowAll?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function change(branchId: string) {
    const query = new URLSearchParams(searchParams.toString());
    if (branchId) query.set("branchId", branchId);
    else query.delete("branchId");
    query.delete("page");
    startTransition(() => router.push(`?${query.toString()}`));
  }

  return (
    <div className="mb-4 flex max-w-xs flex-col gap-1.5">
      <Label className="text-xs">Branch</Label>
      <SelectField
        value={value ?? ""}
        onValueChange={change}
        disabled={pending}
        options={[
          ...(allowAll ? [{ value: "", label: "All branches" }] : []),
          ...branches.map((branch) => ({ value: branch.id, label: `${branch.name} (${branch.code})` })),
        ]}
      />
    </div>
  );
}
