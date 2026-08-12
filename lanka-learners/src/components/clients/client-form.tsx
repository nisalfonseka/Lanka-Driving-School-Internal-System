"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon, UploadIcon, UserIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createClientAction,
  updateClientAction,
  uploadClientPhotoAction,
} from "@/actions/clients";
import { DateOfBirthField } from "@/components/forms/date-of-birth-field";
import { Field, FormSection } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
import {
  VehicleClassPicker,
  type VehicleClassOption,
} from "@/components/forms/vehicle-class-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { calculateAge } from "@/lib/format";
import {
  clientFormSchema,
  type ClientFormInput,
  type ClientFormValues,
} from "@/lib/validations/client";

const SCHEDULE_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "TRAINED", label: "Trained" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "INACTIVE", label: "Inactive" },
];

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function ClientForm({
  vehicleClasses,
  mode,
  clientId,
  defaultValues,
}: {
  vehicleClasses: VehicleClassOption[];
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: Partial<ClientFormInput>;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ClientFormInput, unknown, ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      profilePhoto: "",
      fullName: "",
      idNumber: "",
      dateOfBirth: "",
      address: "",
      mobileMain: "",
      mobileBackup: "",
      mobileWhatsapp: "",
      admissionNumber: "",
      registeredDate: new Date().toISOString().slice(0, 10),
      scheduleType: "BEGINNER",
      vehicleClassIds: [],
      totalAgreedFee: undefined,
      status: "ACTIVE",
      medicalReportNumber: "",
      medicalIssueDate: "",
      schoolCertificateNumber: "",
      dmtBarcodeNumber: "",
      learnerPermitIssueDate: "",
      hasPreviousLicense: false,
      previousLicenseNumber: "",
      previousLicenseIssueDate: "",
      previousLicenseClassIds: [],
      ...defaultValues,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const dateOfBirth = watch("dateOfBirth");
  const hasPreviousLicense = watch("hasPreviousLicense");
  const profilePhoto = watch("profilePhoto");
  const age = calculateAge(dateOfBirth || null);

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (!PROFILE_PHOTO_TYPES.has(file.type)) {
      toast.error("Image must be a JPEG, PNG or WebP file.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await uploadClientPhotoAction(body);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setValue("profilePhoto", result.data.url, { shouldDirty: true });
      toast.success("Photo uploaded");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSubmit(values: ClientFormValues) {
    setFormError(null);

    const result =
      mode === "create"
        ? await createClientAction(values)
        : await updateClientAction(clientId!, values);

    if (!result.ok) {
      setFormError(result.error);

      // Surface server-side field errors (duplicate NIC, etc.) on the inputs.
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          setError(field as keyof ClientFormInput, {
            type: "server",
            message: messages[0],
          });
        }
      }

      toast.error(result.error);
      return;
    }

    toast.success(
      mode === "create" ? "Client registered" : "Client updated"
    );
    router.push(`/clients/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}

      {/* ---------------------------------------------- Personal ------- */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <FormSection
            title="Personal Information"
            description="Identity and contact details for the learner."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="relative flex size-24 items-center justify-center overflow-hidden rounded-lg border bg-muted"
                  aria-busy={uploading}
                >
                  {uploading ? (
                    <>
                      <Skeleton className="absolute inset-0 rounded-none" />
                      <div className="relative z-10 flex flex-col items-center gap-1 text-primary">
                        <LoaderIcon className="size-5 animate-spin" />
                        <span className="text-[10px] font-medium">Uploading</span>
                      </div>
                    </>
                  ) : profilePhoto ? (
                    <Image
                      src={profilePhoto}
                      alt="Profile photo"
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <UserIcon className="size-8 text-muted-foreground" />
                  )}
                </div>

                <p
                  className="h-4 text-center text-[11px] text-muted-foreground"
                  aria-live="polite"
                >
                  {uploading ? "Uploading photo…" : "JPEG, PNG or WebP · max 5 MB"}
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <LoaderIcon className="size-3 animate-spin" />
                    ) : (
                      <UploadIcon className="size-3" />
                    )}
                    {uploading ? "Uploading…" : "Photo"}
                  </Button>

                  {profilePhoto ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove photo"
                      onClick={() =>
                        setValue("profilePhoto", "", { shouldDirty: true })
                      }
                    >
                      <XIcon className="size-3" />
                    </Button>
                  ) : null}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Full Name"
                  htmlFor="fullName"
                  required
                  error={errors.fullName?.message}
                  className="sm:col-span-2"
                >
                  <Input
                    id="fullName"
                    aria-invalid={Boolean(errors.fullName)}
                    {...register("fullName")}
                  />
                </Field>

                <Field
                  label="NIC / ID Number"
                  htmlFor="idNumber"
                  required
                  error={errors.idNumber?.message}
                  hint="9 digits + V/X, or 12 digits"
                >
                  <Input
                    id="idNumber"
                    aria-invalid={Boolean(errors.idNumber)}
                    {...register("idNumber")}
                  />
                </Field>

                <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                  <Field
                    label="Date of Birth"
                    htmlFor="dob-year"
                    required
                    error={errors.dateOfBirth?.message}
                    hint="Year, month, day"
                  >
                    <Controller
                      control={control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <DateOfBirthField
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          invalid={Boolean(errors.dateOfBirth)}
                        />
                      )}
                    />
                  </Field>

                  <Field label="Age" htmlFor="age">
                    {/* Derived from the date of birth — never stored. */}
                    <Input
                      id="age"
                      readOnly
                      tabIndex={-1}
                      value={age ?? ""}
                      placeholder="—"
                      className="bg-muted tabular text-center"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <Field
              label="Address"
              htmlFor="address"
              required
              error={errors.address?.message}
            >
              <Textarea
                id="address"
                rows={2}
                aria-invalid={Boolean(errors.address)}
                {...register("address")}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Main Mobile"
                htmlFor="mobileMain"
                required
                error={errors.mobileMain?.message}
              >
                <Input
                  id="mobileMain"
                  inputMode="tel"
                  aria-invalid={Boolean(errors.mobileMain)}
                  {...register("mobileMain")}
                />
              </Field>

              <Field
                label="Backup Mobile"
                htmlFor="mobileBackup"
                error={errors.mobileBackup?.message}
              >
                <Input
                  id="mobileBackup"
                  inputMode="tel"
                  {...register("mobileBackup")}
                />
              </Field>

              <Field
                label="WhatsApp"
                htmlFor="mobileWhatsapp"
                error={errors.mobileWhatsapp?.message}
              >
                <Input
                  id="mobileWhatsapp"
                  inputMode="tel"
                  {...register("mobileWhatsapp")}
                />
              </Field>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* ------------------------------------------ Registration ------- */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <FormSection
            title="Registration"
            description="Admission details, training type and agreed fee."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Admission Number"
                htmlFor="admissionNumber"
                required
                error={errors.admissionNumber?.message}
              >
                <Input
                  id="admissionNumber"
                  aria-invalid={Boolean(errors.admissionNumber)}
                  {...register("admissionNumber")}
                />
              </Field>

              <Field
                label="Registered Date"
                htmlFor="registeredDate"
                required
                error={errors.registeredDate?.message}
              >
                <Input
                  id="registeredDate"
                  type="date"
                  aria-invalid={Boolean(errors.registeredDate)}
                  {...register("registeredDate")}
                />
              </Field>

              <Field
                label="Training Type"
                htmlFor="scheduleType"
                required
                error={errors.scheduleType?.message}
              >
                <Controller
                  control={control}
                  name="scheduleType"
                  render={({ field }) => (
                    <SelectField
                      id="scheduleType"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={SCHEDULE_OPTIONS}
                    />
                  )}
                />
              </Field>

              <Field
                label="Agreed Total Fee"
                htmlFor="totalAgreedFee"
                required
                error={errors.totalAgreedFee?.message}
                hint="In LKR"
              >
                <Input
                  id="totalAgreedFee"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="tabular"
                  aria-invalid={Boolean(errors.totalAgreedFee)}
                  {...register("totalAgreedFee")}
                />
              </Field>
            </div>

            <Field
              label="Vehicle Classes"
              required
              error={errors.vehicleClassIds?.message}
            >
              <Controller
                control={control}
                name="vehicleClassIds"
                render={({ field }) => (
                  <VehicleClassPicker
                    options={vehicleClasses}
                    selected={field.value ?? []}
                    onChange={field.onChange}
                    idPrefix="client-vc"
                  />
                )}
              />
            </Field>

            {mode === "edit" ? (
              <Field
                label="Status"
                htmlFor="status"
                error={errors.status?.message}
                className="max-w-xs"
              >
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <SelectField
                      id="status"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={STATUS_OPTIONS}
                    />
                  )}
                />
              </Field>
            ) : null}
          </FormSection>
        </CardContent>
      </Card>

      {/* --------------------------------------------- Documents ------- */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <FormSection
            title="Documents"
            description="Medical, school certificate and DMT records. All optional."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Medical Report Number"
                htmlFor="medicalReportNumber"
                error={errors.medicalReportNumber?.message}
              >
                <Input
                  id="medicalReportNumber"
                  {...register("medicalReportNumber")}
                />
              </Field>

              <Field
                label="Medical Issue Date"
                htmlFor="medicalIssueDate"
                error={errors.medicalIssueDate?.message}
              >
                <Input
                  id="medicalIssueDate"
                  type="date"
                  {...register("medicalIssueDate")}
                />
              </Field>

              <Field
                label="School Certificate Number"
                htmlFor="schoolCertificateNumber"
                error={errors.schoolCertificateNumber?.message}
              >
                <Input
                  id="schoolCertificateNumber"
                  {...register("schoolCertificateNumber")}
                />
              </Field>

              <Field
                label="DMT Barcode Number"
                htmlFor="dmtBarcodeNumber"
                error={errors.dmtBarcodeNumber?.message}
              >
                <Input
                  id="dmtBarcodeNumber"
                  {...register("dmtBarcodeNumber")}
                />
              </Field>

              <Field
                label="Learner Permit Issue Date"
                htmlFor="learnerPermitIssueDate"
                error={errors.learnerPermitIssueDate?.message}
              >
                <Input
                  id="learnerPermitIssueDate"
                  type="date"
                  {...register("learnerPermitIssueDate")}
                />
              </Field>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* --------------------------------------- Previous licence ------ */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <FormSection title="Previous License">
            <div className="flex items-center gap-3">
              <Controller
                control={control}
                name="hasPreviousLicense"
                render={({ field }) => (
                  <Switch
                    id="hasPreviousLicense"
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <label htmlFor="hasPreviousLicense" className="text-sm">
                This learner already holds a driving licence
              </label>
            </div>

            {hasPreviousLicense ? (
              <>
                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="License Number"
                    htmlFor="previousLicenseNumber"
                    required
                    error={errors.previousLicenseNumber?.message}
                  >
                    <Input
                      id="previousLicenseNumber"
                      aria-invalid={Boolean(errors.previousLicenseNumber)}
                      {...register("previousLicenseNumber")}
                    />
                  </Field>

                  <Field
                    label="Issue Date"
                    htmlFor="previousLicenseIssueDate"
                    error={errors.previousLicenseIssueDate?.message}
                  >
                    <Input
                      id="previousLicenseIssueDate"
                      type="date"
                      {...register("previousLicenseIssueDate")}
                    />
                  </Field>
                </div>

                <Field
                  label="Vehicle Classes on Licence"
                  required
                  error={errors.previousLicenseClassIds?.message}
                >
                  <Controller
                    control={control}
                    name="previousLicenseClassIds"
                    render={({ field }) => (
                      <VehicleClassPicker
                        options={vehicleClasses}
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        idPrefix="prev-vc"
                      />
                    )}
                  />
                </Field>
              </>
            ) : null}
          </FormSection>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting || uploading}>
          {isSubmitting ? (
            <>
              <LoaderIcon className="size-4 animate-spin" />
              Saving…
            </>
          ) : mode === "create" ? (
            "Register Client"
          ) : (
            "Save Changes"
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
