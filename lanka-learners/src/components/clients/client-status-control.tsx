"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setClientStatusAction } from "@/actions/clients";
import { SelectField } from "@/components/forms/select-field";
import { humanise } from "@/lib/format";

const OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
];

/** Owner-only: switches a client between Active and Completed from the profile. */
export function ClientStatusControl({
  clientId,
  status,
}: {
  clientId: string;
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  const selectId = `client-status-${clientId}`;

  function change(next: string) {
    if (next === value) return;

    const previous = value;
    setValue(next);

    startTransition(async () => {
      const result = await setClientStatusAction({ clientId, status: next });

      if (!result.ok) {
        setValue(previous);
        toast.error(result.error);
        return;
      }

      toast.success(`Status changed to ${humanise(next)}`);
      router.refresh();
    });
  }

  return (
    <div>
      <label htmlFor={selectId} className="sr-only">
        Client status
      </label>
      <SelectField
        id={selectId}
        className="w-36"
        value={value}
        onValueChange={change}
        options={OPTIONS}
        disabled={pending}
      />
    </div>
  );
}
