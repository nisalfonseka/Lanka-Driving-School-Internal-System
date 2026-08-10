"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateSettingsAction } from "@/actions/settings";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { settingsSchema, type SettingsInput } from "@/lib/validations/admin";

export function SettingsForm({ defaults }: { defaults: SettingsInput }) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: SettingsInput) {
    const result = await updateSettingsAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof SettingsInput, {
            type: "server",
            message: messages[0],
          });
        }
      }
      toast.error(result.error);
      return;
    }

    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="System Name"
          htmlFor="systemName"
          required
          error={errors.systemName?.message}
          hint="Shown in the sidebar and on the sign-in page."
        >
          <Input
            id="systemName"
            aria-invalid={Boolean(errors.systemName)}
            {...register("systemName")}
          />
        </Field>

        <Field
          label="Business Name"
          htmlFor="businessName"
          required
          error={errors.businessName?.message}
          hint="Printed at the top of receipts."
        >
          <Input
            id="businessName"
            aria-invalid={Boolean(errors.businessName)}
            {...register("businessName")}
          />
        </Field>

        <Field
          label="Business Phone"
          htmlFor="businessPhone"
          error={errors.businessPhone?.message}
        >
          <Input id="businessPhone" {...register("businessPhone")} />
        </Field>

        <Field
          label="Business Email"
          htmlFor="businessEmail"
          error={errors.businessEmail?.message}
        >
          <Input id="businessEmail" {...register("businessEmail")} />
        </Field>
      </div>

      <Field
        label="Business Address"
        htmlFor="businessAddress"
        error={errors.businessAddress?.message}
      >
        <Textarea
          id="businessAddress"
          rows={2}
          {...register("businessAddress")}
        />
      </Field>

      <Field
        label="Receipt Footer"
        htmlFor="receiptFooter"
        error={errors.receiptFooter?.message}
        hint="A short line printed at the bottom of every receipt."
      >
        <Input id="receiptFooter" {...register("receiptFooter")} />
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <LoaderIcon className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save Settings"
        )}
      </Button>
    </form>
  );
}
