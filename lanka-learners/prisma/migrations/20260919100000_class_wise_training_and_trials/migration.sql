-- New audit actions for inline client status changes and document top-ups.
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_CLIENT_STATUS';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_CLIENT_DOCUMENTS';

-- Practical training: the status moves from the training day onto each class.
-- Existing classes inherit the status of the day they belong to, so nothing is
-- lost; classes added from now on start as Completed.
ALTER TABLE "practical_training_classes" ADD COLUMN "status" "TrainingStatus" NOT NULL DEFAULT 'COMPLETED';

UPDATE "practical_training_classes" AS c
SET "status" = t."status"
FROM "practical_trainings" AS t
WHERE t."id" = c."trainingId";

ALTER TABLE "practical_trainings" DROP COLUMN "status";

-- Practical trials: each trial belongs to one vehicle class. Trials recorded
-- before this change have no class. Where the client has exactly one class it
-- is unambiguous, so it is filled in; the rest stay empty until an owner
-- assigns a class.
ALTER TABLE "trial_exams" ADD COLUMN "vehicleClassId" TEXT;

UPDATE "trial_exams" AS te
SET "vehicleClassId" = only_class."vehicleClassId"
FROM (
  SELECT "clientId", MIN("vehicleClassId") AS "vehicleClassId"
  FROM "client_vehicle_classes"
  GROUP BY "clientId"
  HAVING COUNT(*) = 1
) AS only_class
WHERE only_class."clientId" = te."clientId";

-- CreateIndex
CREATE INDEX "trial_exams_vehicleClassId_idx" ON "trial_exams"("vehicleClassId");

-- AddForeignKey
ALTER TABLE "trial_exams" ADD CONSTRAINT "trial_exams_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
