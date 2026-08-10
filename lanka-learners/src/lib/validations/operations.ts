import { z } from "zod";

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

export const attendanceEnum = z.enum(["PRESENT", "ABSENT"]);
export const examResultEnum = z.enum(["PASS", "FAIL", "ABSENT", "PENDING"]);
export const trialResultEnum = z.enum(["PASS", "FAIL", "ABSENT", "PENDING"]);

const examShape = {
  clientId: cuidSchema,
  examDate: dateStringSchema,
  dmtBarcode: optionalText(60),
  attendance: attendanceEnum,
  result: examResultEnum,
};

export const examCreateSchema = z.object(examShape).refine(
  // An absent candidate cannot have passed or failed.
  (value) => value.attendance !== "ABSENT" || value.result === "ABSENT",
  {
    message: "An absent candidate must have the result 'Absent'",
    path: ["result"],
  }
);

export const examUpdateSchema = z
  .object({ id: cuidSchema, ...examShape })
  .refine(
    (value) => value.attendance !== "ABSENT" || value.result === "ABSENT",
    {
      message: "An absent candidate must have the result 'Absent'",
      path: ["result"],
    }
  );

export type ExamCreateInput = z.infer<typeof examCreateSchema>;
export type ExamUpdateInput = z.infer<typeof examUpdateSchema>;

// ---------------------------------------------------------------------------
// Practical trials
// ---------------------------------------------------------------------------

const trialShape = {
  clientId: cuidSchema,
  trialDate: dateStringSchema,
  dmtBarcode: optionalText(60),
  result: trialResultEnum,
  resultNotes: optionalText(500),
};

export const trialCreateSchema = z.object(trialShape);
export const trialUpdateSchema = z.object({ id: cuidSchema, ...trialShape });

export type TrialCreateInput = z.infer<typeof trialCreateSchema>;
export type TrialUpdateInput = z.infer<typeof trialUpdateSchema>;

// ---------------------------------------------------------------------------
// Lecture attendance
// ---------------------------------------------------------------------------

const lectureShape = {
  clientId: cuidSchema,
  attendanceDate: dateStringSchema,
  status: attendanceEnum,
};

export const lectureCreateSchema = z.object(lectureShape);
export const lectureUpdateSchema = z.object({
  id: cuidSchema,
  ...lectureShape,
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
  "FUEL",
  "OTHER",
]);
export const fuelSubCategoryEnum = z.enum(["PETROL", "DIESEL"]);

const expenseShape = {
  expenseDate: dateStringSchema,
  category: expenseCategoryEnum,
  subCategory: fuelSubCategoryEnum.optional(),
  amount: amountSchema,
  description: optionalText(300),
};

const fuelNeedsSubCategory = (value: {
  category: string;
  subCategory?: string;
}) => value.category !== "FUEL" || Boolean(value.subCategory);

export const expenseCreateSchema = z
  .object(expenseShape)
  .refine(fuelNeedsSubCategory, {
    message: "Select petrol or diesel for a fuel expense",
    path: ["subCategory"],
  });

export const expenseUpdateSchema = z
  .object({ id: cuidSchema, ...expenseShape })
  .refine(fuelNeedsSubCategory, {
    message: "Select petrol or diesel for a fuel expense",
    path: ["subCategory"],
  });

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;

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
