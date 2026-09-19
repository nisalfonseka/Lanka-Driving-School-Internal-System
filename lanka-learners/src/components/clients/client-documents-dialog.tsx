"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateClientDocumentsAction } from "@/actions/clients";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DOCUMENT_FIELDS,
  DOCUMENT_LABELS,
  filledFields,
  type DocumentField,
  type DocumentValues,
} from "@/lib/client-documents";
import { clientDocumentsSchema } from "@/lib/validations/client";

type FormValues = {
  clientId: string;
  medicalReportNumber?: string;
  medicalIssueDate?: string;
  schoolCertificateNumber?: string;
  dmtBarcodeNumber?: string;
  learnerPermitNumber?: string;
  learnerPermitIssueDate?: string;
};

const DATE_FIELDS = new Set<DocumentField>([
  "medicalIssueDate",
  "learnerPermitIssueDate",
]);

/**
 * Documents are often not available at registration, so they can be added
 * afterwards. Owners can change anything; everyone else can only fill fields
 * that are still blank — the server enforces this, the read-only inputs here
 * just make it obvious.
 */
export function ClientDocumentsDialog({
  clientId,
  clientLabel,
  values,
  isOwner,
}: {
  clientId: string;
  clientLabel: string;
  values: DocumentValues;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const locked = new Set<DocumentField>(isOwner ? [] : filledFields(values));

  const defaults: FormValues = {
    clientId,
    ...Object.fromEntries(
      DOCUMENT_FIELDS.map((field) => [field, values[field] ?? ""])
    ),
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(clientDocumentsSchema),
    defaultValues: defaults,
  });

  // Nothing left for an employee to add.
  if (!isOwner && locked.size === DOCUMENT_FIELDS.length) return null;

  async function onSubmit(form: FormValues) {
    // Locked values go back exactly as stored, whatever the form holds.
    const payload = {
      ...form,
      clientId,
      ...Object.fromEntries(
        [...locked].map((field) => [field, values[field] ?? ""])
      ),
    };

    const result = await updateClientDocumentsAction(payload);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof FormValues, {
            type: "server",
            message: messages[0],
          });
        }
      }
      toast.error(result.error);
      return;
    }

    toast.success("Documents saved");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="xs">
            {isOwner ? (
              <PencilIcon className="size-3" />
            ) : (
              <PlusIcon className="size-3" />
            )}
            {isOwner ? "Edit documents" : "Add missing documents"}
          </Button>
        }
      />

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isOwner ? "Edit documents" : "Add missing documents"}
          </DialogTitle>
          <DialogDescription>{clientLabel}</DialogDescription>
        </DialogHeader>

        <form
          id="documents-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {!isOwner ? (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              Fill in anything that was not available at registration.
              Documents that are already recorded are locked — only an owner
              can change them.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {DOCUMENT_FIELDS.map((field) => {
              const isLocked = locked.has(field);
              return (
                <Field
                  key={field}
                  label={DOCUMENT_LABELS[field]}
                  htmlFor={`doc-${field}`}
                  error={errors[field]?.message}
                  hint={isLocked ? "Already recorded" : undefined}
                >
                  <Input
                    id={`doc-${field}`}
                    type={DATE_FIELDS.has(field) ? "date" : "text"}
                    readOnly={isLocked}
                    aria-invalid={Boolean(errors[field])}
                    className={isLocked ? "bg-muted" : undefined}
                    {...register(field)}
                  />
                </Field>
              );
            })}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="documents-form"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Documents"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
