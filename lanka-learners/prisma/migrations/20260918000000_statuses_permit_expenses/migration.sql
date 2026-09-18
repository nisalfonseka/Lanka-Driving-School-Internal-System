-- Learner permit number on client documents
ALTER TABLE "client_documents" ADD COLUMN "learnerPermitNumber" TEXT;

-- Client status: only ACTIVE and COMPLETED remain. Inactive clients become active.
UPDATE "clients" SET "status" = 'ACTIVE' WHERE "status" = 'INACTIVE';
ALTER TYPE "ClientStatus" RENAME TO "ClientStatus_old";
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'COMPLETED');
ALTER TABLE "clients" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "clients" ALTER COLUMN "status" TYPE "ClientStatus" USING ("status"::text::"ClientStatus");
ALTER TABLE "clients" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "ClientStatus_old";

-- Cancelled status for exams and trials
ALTER TYPE "ExamResult" ADD VALUE 'CANCELLED';
ALTER TYPE "TrialResult" ADD VALUE 'CANCELLED';

-- Lecture attendance gets its own status type (adds PENDING and CANCELLED)
CREATE TYPE "LectureStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT', 'CANCELLED');
ALTER TABLE "lecture_attendance" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "lecture_attendance" ALTER COLUMN "status" TYPE "LectureStatus" USING ("status"::text::"LectureStatus");
ALTER TABLE "lecture_attendance" ALTER COLUMN "status" SET DEFAULT 'PRESENT';

-- Practical training status. Existing records were completed sessions.
CREATE TYPE "TrainingStatus" AS ENUM ('PENDING', 'COMPLETED', 'ABSENT', 'CANCELLED');
ALTER TABLE "practical_trainings" ADD COLUMN "status" "TrainingStatus" NOT NULL DEFAULT 'COMPLETED';

-- Expense categories: FUEL (+ petrol/diesel subcategory) becomes PETROL / DIESEL.
CREATE TYPE "ExpenseCategory_new" AS ENUM ('OFFICE_ACCESSORIES', 'VEHICLE_REPAIRS', 'VEHICLE_SERVICES', 'PETROL', 'DIESEL', 'OTHER');
ALTER TABLE "company_expenses" ALTER COLUMN "category" TYPE "ExpenseCategory_new" USING (
  CASE
    WHEN "category"::text = 'FUEL' AND "subCategory"::text = 'DIESEL' THEN 'DIESEL'
    WHEN "category"::text = 'FUEL' THEN 'PETROL'
    ELSE "category"::text
  END
)::"ExpenseCategory_new";
DROP TYPE "ExpenseCategory";
ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";
ALTER TABLE "company_expenses" DROP COLUMN "subCategory";
DROP TYPE "FuelSubCategory";

-- Audit actions for result updates
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_EXAM_RESULT';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_TRIAL_RESULT';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_LECTURE_RESULT';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_TRAINING_RESULT';
