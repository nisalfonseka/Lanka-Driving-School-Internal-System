import { z } from "zod";

import { passwordSchema } from "./auth";
import { branchIdSchema, cuidSchema, optionalText } from "./common";

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(40, "Username is too long")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username may only contain letters, numbers, dots, underscores and hyphens"
  )
  .transform((value) => value.toLowerCase());

const optionalEmailSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value.toLowerCase()))
  .optional()
  .refine(
    (value) => value === undefined || z.email().safeParse(value).success,
    "Enter a valid email address"
  );

const optionalUserMobileSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      /^(?:\+94|94|0)?\d{9}$/.test(value.replace(/[\s-]/g, "")),
    "Enter a valid mobile number"
  );

export const employeeCreateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(120, "Full name is too long"),
  username: usernameSchema,
  email: optionalEmailSchema,
  mobile: optionalUserMobileSchema,
  password: passwordSchema,
  branchId: branchIdSchema,
});

export const employeeUpdateSchema = z.object({
  id: cuidSchema,
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(120, "Full name is too long"),
  email: optionalEmailSchema,
  mobile: optionalUserMobileSchema,
  branchId: branchIdSchema.optional(),
});

export const employeeStatusSchema = z.object({
  id: cuidSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const passwordResetSchema = z
  .object({
    id: cuidSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

const branchShape = {
  code: z
    .string()
    .trim()
    .min(2, "Code is required")
    .max(10, "Code is too long")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only")
    .transform((value) => value.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(2, "Branch name is required")
    .max(80, "Branch name is too long"),
};

export const branchCreateSchema = z.object(branchShape);
export const branchUpdateSchema = z.object({
  id: branchIdSchema,
  ...branchShape,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type BranchCreateInput = z.infer<typeof branchCreateSchema>;
export type BranchUpdateInput = z.infer<typeof branchUpdateSchema>;

// ---------------------------------------------------------------------------
// Vehicle classes
// ---------------------------------------------------------------------------

export const vehicleClassCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(10, "Code is too long")
    .transform((value) => value.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(80, "Name is too long"),
});

export const vehicleClassUpdateSchema = z.object({
  id: cuidSchema,
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(10, "Code is too long")
    .transform((value) => value.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(80, "Name is too long"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type VehicleClassCreateInput = z.infer<typeof vehicleClassCreateSchema>;
export type VehicleClassUpdateInput = z.infer<typeof vehicleClassUpdateSchema>;

// ---------------------------------------------------------------------------
// System settings
// ---------------------------------------------------------------------------

export const settingsSchema = z.object({
  systemName: z
    .string()
    .trim()
    .min(2, "System name is required")
    .max(80, "System name is too long"),
  businessName: z
    .string()
    .trim()
    .min(2, "Business name is required")
    .max(120, "Business name is too long"),
  businessAddress: optionalText(300),
  businessPhone: optionalText(40),
  businessEmail: optionalText(120),
  businessWebsite: z
    .string()
    .trim()
    .max(200, "Website URL is too long")
    .refine(
      (value) => value === "" || z.url().safeParse(value).success,
      "Enter a complete website URL, including https://"
    ),
  receiptFooter: optionalText(200),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const smsEventSchema = z.enum([
  "CLIENT_REGISTERED",
  "PAYMENT_RECEIVED",
  "WRITTEN_EXAM_SCHEDULED",
  "WRITTEN_EXAM_RESULT",
  "PRACTICAL_TRIAL_SCHEDULED",
  "PRACTICAL_TRIAL_RESULT",
  "CLIENT_COMPLETED",
]);

export const smsSettingsSchema = z.object({
  enabled: z.boolean(),
  senderId: z
    .string()
    .trim()
    .max(20, "Sender ID must be 20 characters or fewer")
    .regex(
      /^[A-Za-z0-9._ -]*$/,
      "Sender ID may only contain letters, numbers, spaces, dots, underscores and hyphens"
    ),
  events: z.record(smsEventSchema, z.boolean()),
});

export type SmsSettingsInput = z.infer<typeof smsSettingsSchema>;

// ---------------------------------------------------------------------------
// Audit log filters
// ---------------------------------------------------------------------------

export const auditSearchSchema = z.object({
  userId: optionalText(40),
  action: optionalText(60),
  entityType: optionalText(60),
  from: optionalText(10),
  to: optionalText(10),
  page: z.coerce.number().int().min(1).default(1),
});

export type AuditSearchParams = z.infer<typeof auditSearchSchema>;
