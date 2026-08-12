import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(60, "Username is too long"),
  password: z.string().min(1, "Password is required").max(200),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Password policy for accounts created or reset by the owner.
 * Deliberately practical rather than maximal — staff must be able to use it.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long")
  .refine((value) => /[A-Za-z]/.test(value), "Password must contain a letter")
  .refine((value) => /\d/.test(value), "Password must contain a number");
