import { z } from "zod";

import {
  admissionNumberSchema,
  amountSchema,
  cuidSchema,
  dateStringSchema,
  mobileSchema,
  nicSchema,
  optionalDateStringSchema,
  optionalMobileSchema,
  optionalText,
  vehicleClassIdsSchema,
} from "./common";

export const clientStatusEnum = z.enum(["ACTIVE", "COMPLETED", "INACTIVE"]);
export const scheduleTypeEnum = z.enum(["BEGINNER", "TRAINED"]);

const MIN_AGE = 15;
const MAX_AGE = 100;

export const clientFormSchema = z
  .object({
    // Personal
    profilePhoto: optionalText(600),
    fullName: z
      .string()
      .trim()
      .min(2, "Full name is required")
      .max(120, "Full name is too long"),
    idNumber: nicSchema,
    dateOfBirth: dateStringSchema,
    address: z
      .string()
      .trim()
      .min(3, "Address is required")
      .max(300, "Address is too long"),
    mobileMain: mobileSchema,
    mobileBackup: optionalMobileSchema,
    mobileWhatsapp: optionalMobileSchema,

    // Registration
    admissionNumber: admissionNumberSchema,
    registeredDate: dateStringSchema,
    scheduleType: scheduleTypeEnum,
    vehicleClassIds: vehicleClassIdsSchema,
    totalAgreedFee: amountSchema,
    status: clientStatusEnum.default("ACTIVE"),

    // Documents
    medicalReportNumber: optionalText(60),
    medicalIssueDate: optionalDateStringSchema,
    schoolCertificateNumber: optionalText(60),
    dmtBarcodeNumber: optionalText(60),
    learnerPermitIssueDate: optionalDateStringSchema,

    // Previous licence
    hasPreviousLicense: z.boolean().default(false),
    previousLicenseNumber: optionalText(60),
    previousLicenseIssueDate: optionalDateStringSchema,
    previousLicenseClassIds: z.array(cuidSchema).default([]),
  })
  // Checked before the age range so a future date reports the clearer message.
  .refine(
    (value) => new Date(`${value.dateOfBirth}T00:00:00Z`) <= new Date(),
    {
      message: "Date of birth cannot be in the future",
      path: ["dateOfBirth"],
    }
  )
  .refine(
    (value) => {
      // Exact age, not a year subtraction — someone whose birthday has not yet
      // happened this year is still a year younger.
      const dob = new Date(`${value.dateOfBirth}T00:00:00Z`);
      const now = new Date();

      let age = now.getUTCFullYear() - dob.getUTCFullYear();
      const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
      if (
        monthDelta < 0 ||
        (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())
      ) {
        age -= 1;
      }

      return age >= MIN_AGE && age <= MAX_AGE;
    },
    {
      message: `The learner must be between ${MIN_AGE} and ${MAX_AGE} years old`,
      path: ["dateOfBirth"],
    }
  )
  .refine(
    // A licence number is mandatory once "has previous licence" is ticked.
    (value) =>
      !value.hasPreviousLicense ||
      (value.previousLicenseNumber?.trim().length ?? 0) > 0,
    {
      message: "Licence number is required",
      path: ["previousLicenseNumber"],
    }
  )
  .refine(
    (value) =>
      !value.hasPreviousLicense || value.previousLicenseClassIds.length > 0,
    {
      message: "Select at least one vehicle class for the previous licence",
      path: ["previousLicenseClassIds"],
    }
  );

export type ClientFormInput = z.input<typeof clientFormSchema>;
export type ClientFormValues = z.output<typeof clientFormSchema>;

export const clientSearchSchema = z.object({
  q: optionalText(120),
  idNumber: optionalText(20),
  admissionNumber: optionalText(30),
  from: optionalDateStringSchema,
  to: optionalDateStringSchema,
  status: clientStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type ClientSearchParams = z.infer<typeof clientSearchSchema>;
