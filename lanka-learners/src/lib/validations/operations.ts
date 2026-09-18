import { z } from "zod";

import { BOOKING_SLOTS } from "@/lib/booking-slots";

import {
  amountSchema,
  cuidSchema,
  dateStringSchema,
  optionalDateStringSchema,
  optionalText,
  vehicleClassIdsSchema,
} from "./common";

// ---------------------------------------------------------------------------
// Written exams
// ---------------------------------------------------------------------------

export const examResultEnum = z.enum([
  "PENDING",
  "PASS",
  "FAIL",
  "ABSENT",
  "CANCELLED",
]);
export const trialResultEnum = z.enum([
  "PENDING",
  "PASS",
  "FAIL",
  "ABSENT",
  "CANCELLED",
]);
export const lectureStatusEnum = z.enum([
  "PENDING",
  "PRESENT",
  "ABSENT",
  "CANCELLED",
]);
export const trainingStatusEnum = z.enum([
  "PENDING",
  "COMPLETED",
  "ABSENT",
  "CANCELLED",
]);

// New records always start as Pending. The status/result is never part of the
// add or edit forms — it only changes through "Add Results".

const examShape = {
  clientId: cuidSchema,
  examDate: dateStringSchema,
  dmtBarcode: optionalText(60),
};

export const examCreateSchema = z.object(examShape);
export const examUpdateSchema = z.object({ id: cuidSchema, ...examShape });

/** Result-only update, allowed for every signed-in user. */
export const examResultSchema = z.object({
  id: cuidSchema,
  result: examResultEnum,
});

export type ExamCreateInput = z.infer<typeof examCreateSchema>;
export type ExamUpdateInput = z.infer<typeof examUpdateSchema>;

// ---------------------------------------------------------------------------
// Practical trials
// ---------------------------------------------------------------------------

const trialShape = {
  clientId: cuidSchema,
  trialDate: dateStringSchema,
  dmtBarcode: optionalText(60),
};

export const trialCreateSchema = z.object(trialShape);
export const trialUpdateSchema = z.object({ id: cuidSchema, ...trialShape });

export const trialResultSchema = z.object({
  id: cuidSchema,
  result: trialResultEnum,
  resultNotes: optionalText(500),
});

export type TrialCreateInput = z.infer<typeof trialCreateSchema>;
export type TrialUpdateInput = z.infer<typeof trialUpdateSchema>;

// ---------------------------------------------------------------------------
// Lecture attendance
// ---------------------------------------------------------------------------

const lectureShape = {
  clientId: cuidSchema,
  attendanceDate: dateStringSchema,
};

export const lectureCreateSchema = z.object(lectureShape);
export const lectureUpdateSchema = z.object({
  id: cuidSchema,
  ...lectureShape,
});

export const lectureResultSchema = z.object({
  id: cuidSchema,
  status: lectureStatusEnum,
});

export type LectureCreateInput = z.infer<typeof lectureCreateSchema>;
export type LectureUpdateInput = z.infer<typeof lectureUpdateSchema>;

// ---------------------------------------------------------------------------
// Practical training — one record, many vehicle classes
// ---------------------------------------------------------------------------

const trainingShape = {
  clientId: cuidSchema,
  trainingDate: dateStringSchema,
  vehicleClassIds: vehicleClassIdsSchema,
  notes: optionalText(500),
};

export const trainingCreateSchema = z.object(trainingShape);
export const trainingUpdateSchema = z.object({
  id: cuidSchema,
  ...trainingShape,
});

export const trainingResultSchema = z.object({
  id: cuidSchema,
  status: trainingStatusEnum,
  notes: optionalText(500),
});

export type TrainingCreateInput = z.infer<typeof trainingCreateSchema>;
export type TrainingUpdateInput = z.infer<typeof trainingUpdateSchema>;

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const paymentTypeEnum = z.enum([
  "ADVANCE",
  "INSTALLMENT",
  "TRAINING_FEE",
  "OTHER",
]);

const paymentShape = {
  clientId: cuidSchema,
  paymentDate: dateStringSchema,
  billNumber: z
    .string()
    .trim()
    .min(1, "Bill number is required")
    .max(30, "Bill number is too long")
    .regex(
      /^[A-Za-z0-9/-]+$/,
      "Bill number may only contain letters, numbers, / and -"
    )
    .transform((value) => value.toUpperCase()),
  amount: amountSchema,
  paymentType: paymentTypeEnum,
  description: optionalText(300),
};

export const paymentCreateSchema = z.object(paymentShape);
export const paymentUpdateSchema = z.object({
  id: cuidSchema,
  ...paymentShape,
});

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;

// ---------------------------------------------------------------------------
// Company expenses
// ---------------------------------------------------------------------------

export const expenseCategoryEnum = z.enum([
  "OFFICE_ACCESSORIES",
  "VEHICLE_REPAIRS",
  "VEHICLE_SERVICES",
  "PETROL",
  "DIESEL",
  "OTHER",
]);

const expenseShape = {
  expenseDate: dateStringSchema,
  category: expenseCategoryEnum,
  amount: amountSchema,
  description: optionalText(300),
};

export const expenseCreateSchema = z.object(expenseShape);
export const expenseUpdateSchema = z.object({ id: cuidSchema, ...expenseShape });

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;

// ---------------------------------------------------------------------------
// Training bookings
// ---------------------------------------------------------------------------

export const bookingSlotEnum = z.enum(BOOKING_SLOTS, {
  error: "Select a time slot",
});
export const bookingAttendanceEnum = z.enum(["PENDING", "PRESENT", "ABSENT"]);

/** Any phone number: 9–15 digits, optionally with +, spaces or dashes. */
const contactNumberSchema = z
  .string()
  .trim()
  .min(1, "Contact number is required")
  .refine((value) => /^\+?[\d\s-]+$/.test(value), "Enter a valid phone number")
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 9 && digits <= 15;
  }, "Enter a valid phone number");

const bookingShape = {
  bookingDate: dateStringSchema,
  slot: bookingSlotEnum,
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(120, "Name is too long"),
  contactNumber: contactNumberSchema,
};

export const bookingCreateSchema = z.object(bookingShape);
export const bookingUpdateSchema = z.object({
  id: cuidSchema,
  ...bookingShape,
  attendance: bookingAttendanceEnum,
});
export const bookingAttendanceSchema = z.object({
  id: cuidSchema,
  attendance: bookingAttendanceEnum,
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;

// ---------------------------------------------------------------------------
// Shared search parameters
// ---------------------------------------------------------------------------

export const operationSearchSchema = z.object({
  q: optionalText(120),
  clientId: optionalText(40),
  from: optionalDateStringSchema,
  to: optionalDateStringSchema,
  page: z.coerce.number().int().min(1).default(1),
});

export type OperationSearchParams = z.infer<typeof operationSearchSchema>;
