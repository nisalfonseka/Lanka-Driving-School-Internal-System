-- Weekly client exports preserve the exact client snapshot captured on the
-- first download of each week, while keeping PDF and CSV download histories.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'EXPORT_CLIENTS_PDF';
ALTER TYPE "AuditAction" ADD VALUE 'EXPORT_CLIENTS_CSV';

-- CreateTable
CREATE TABLE "weekly_client_exports" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientCount" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "capturedById" TEXT,
    "pdfDownloadCount" INTEGER NOT NULL DEFAULT 0,
    "pdfFirstDownloadedAt" TIMESTAMP(3),
    "pdfLastDownloadedAt" TIMESTAMP(3),
    "csvDownloadCount" INTEGER NOT NULL DEFAULT 0,
    "csvFirstDownloadedAt" TIMESTAMP(3),
    "csvLastDownloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_client_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_client_exports_weekStart_key" ON "weekly_client_exports"("weekStart");

-- CreateIndex
CREATE INDEX "weekly_client_exports_weekStart_idx" ON "weekly_client_exports"("weekStart");

-- AddForeignKey
ALTER TABLE "weekly_client_exports" ADD CONSTRAINT "weekly_client_exports_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
