-- Written exams no longer track attendance separately: an absent candidate is
-- recorded through the result. Carry any absence into the result first.
UPDATE "written_exams" SET "result" = 'ABSENT' WHERE "attendance" = 'ABSENT' AND "result" = 'PENDING';

-- Trigram support for fast "contains" searches on clients.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- DropIndex
DROP INDEX "written_exams_clientId_idx";

-- DropIndex
DROP INDEX "trial_exams_clientId_idx";

-- DropIndex
DROP INDEX "practical_trainings_clientId_idx";

-- DropIndex
DROP INDEX "client_payments_clientId_idx";

-- DropIndex
DROP INDEX "audit_logs_userId_idx";

-- AlterTable
ALTER TABLE "written_exams" DROP COLUMN "attendance";

-- AlterTable
ALTER TABLE "lecture_attendance" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "practical_trainings" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "AttendanceStatus";

-- CreateIndex
CREATE INDEX "clients_fullName_trgm_idx" ON "clients" USING GIN ("fullName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "clients_idNumber_trgm_idx" ON "clients" USING GIN ("idNumber" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "clients_admissionNumber_trgm_idx" ON "clients" USING GIN ("admissionNumber" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "clients_mobileMain_trgm_idx" ON "clients" USING GIN ("mobileMain" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "written_exams_clientId_examDate_idx" ON "written_exams"("clientId", "examDate");

-- CreateIndex
CREATE INDEX "trial_exams_clientId_trialDate_idx" ON "trial_exams"("clientId", "trialDate");

-- CreateIndex
CREATE INDEX "practical_trainings_clientId_trainingDate_idx" ON "practical_trainings"("clientId", "trainingDate");

-- CreateIndex
CREATE INDEX "client_payments_clientId_paymentDate_idx" ON "client_payments"("clientId", "paymentDate");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

