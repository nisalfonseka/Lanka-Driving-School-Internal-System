import { z } from "zod";

import { passwordSchema } from "./auth";
import { cuidSchema, optionalText } from "./common";

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
  receiptFooter: optionalText(200),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

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
