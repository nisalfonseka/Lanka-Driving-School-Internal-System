"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2Icon, LoaderIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createBranchAction, updateBranchAction } from "@/actions/settings";
import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { branchCreateSchema } from "@/lib/validations/admin";

const branchFormSchema = branchCreateSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});
type BranchFormInput = z.input<typeof branchFormSchema>;
type BranchFormValues = z.output<typeof branchFormSchema>;

type Branch = { id: string; code: string; name: string; status: "ACTIVE" | "INACTIVE" };

export function BranchDialog({ branch }: { branch?: Branch }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { register, control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<BranchFormInput, unknown, BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: branch
      ? { code: branch.code, name: branch.name, status: branch.status }
      : { code: "", name: "", status: "ACTIVE" },
  });

  async function submit(values: BranchFormValues) {
    const result = branch
      ? await updateBranchAction({ ...values, id: branch.id })
      : await createBranchAction(values);
    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as "code" | "name", { type: "server", message: messages[0] });
        }
      }
      toast.error(result.error);
      return;
    }
    toast.success(branch ? "Branch updated" : "Branch added");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger render={branch ? <Button variant="outline" size="xs"><PencilIcon className="size-3" />Edit</Button> : <Button><Building2Icon className="size-4" />Add Branch</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{branch ? "Edit Branch" : "Add Branch"}</DialogTitle>
          <DialogDescription>Branches control employee access and branch-wise reporting.</DialogDescription>
        </DialogHeader>
        <form id="branch-form" onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <Field label="Branch Code" required error={errors.code?.message}>
            <Input {...register("code")} placeholder="e.g. KEK" />
          </Field>
          <Field label="Branch Name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="e.g. Kekirawa" />
          </Field>
          {branch ? (
            <Field label="Status" required>
              <Controller control={control} name="status" render={({ field }) => <SelectField value={field.value} onValueChange={field.onChange} options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />} />
            </Field>
          ) : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="branch-form" disabled={isSubmitting}>{isSubmitting ? <><LoaderIcon className="size-4 animate-spin" />Saving…</> : branch ? "Save Changes" : "Add Branch"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
