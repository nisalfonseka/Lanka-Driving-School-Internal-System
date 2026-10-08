-- Create the initial branch directory.
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_BRANCH';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_BRANCH';

CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");
CREATE INDEX "branches_status_idx" ON "branches"("status");

INSERT INTO "branches" ("id", "code", "name", "updatedAt") VALUES
('branch_kekirawa', 'KEK', 'Kekirawa', CURRENT_TIMESTAMP),
('branch_thalawa', 'THA', 'Thalawa', CURRENT_TIMESTAMP);

-- Employees and existing operational data begin at Kekirawa. Owners remain
-- unassigned because they may work with every branch.
ALTER TABLE "users" ADD COLUMN "branchId" TEXT;
UPDATE "users" SET "branchId" = 'branch_kekirawa' WHERE "role" = 'EMPLOYEE';
CREATE INDEX "users_branchId_idx" ON "users"("branchId");

ALTER TABLE "clients" ADD COLUMN "branchId" TEXT;
UPDATE "clients" SET "branchId" = COALESCE(
  (SELECT u."branchId" FROM "users" u WHERE u."id" = "clients"."createdById"),
  'branch_kekirawa'
);
ALTER TABLE "clients" ALTER COLUMN "branchId" SET NOT NULL;
CREATE INDEX "clients_branchId_registeredDate_idx" ON "clients"("branchId", "registeredDate");

ALTER TABLE "company_expenses" ADD COLUMN "branchId" TEXT;
UPDATE "company_expenses" SET "branchId" = COALESCE(
  (SELECT u."branchId" FROM "users" u WHERE u."id" = "company_expenses"."createdById"),
  'branch_kekirawa'
);
ALTER TABLE "company_expenses" ALTER COLUMN "branchId" SET NOT NULL;
CREATE INDEX "company_expenses_branchId_expenseDate_idx" ON "company_expenses"("branchId", "expenseDate");

ALTER TABLE "training_bookings" ADD COLUMN "branchId" TEXT;
UPDATE "training_bookings" SET "branchId" = COALESCE(
  (SELECT u."branchId" FROM "users" u WHERE u."id" = "training_bookings"."createdById"),
  'branch_kekirawa'
);
ALTER TABLE "training_bookings" ALTER COLUMN "branchId" SET NOT NULL;
DROP INDEX "training_bookings_bookingDate_slot_seat_key";
CREATE UNIQUE INDEX "training_bookings_branchId_bookingDate_slot_seat_key"
ON "training_bookings"("branchId", "bookingDate", "slot", "seat");
CREATE INDEX "training_bookings_branchId_bookingDate_idx" ON "training_bookings"("branchId", "bookingDate");

ALTER TABLE "weekly_client_exports" ADD COLUMN "scopeKey" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "weekly_client_exports" ADD COLUMN "branchId" TEXT;
DROP INDEX "weekly_client_exports_weekStart_key";
CREATE UNIQUE INDEX "weekly_client_exports_weekStart_scopeKey_key" ON "weekly_client_exports"("weekStart", "scopeKey");
CREATE INDEX "weekly_client_exports_branchId_weekStart_idx" ON "weekly_client_exports"("branchId", "weekStart");

ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "training_bookings" ADD CONSTRAINT "training_bookings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "weekly_client_exports" ADD CONSTRAINT "weekly_client_exports_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
