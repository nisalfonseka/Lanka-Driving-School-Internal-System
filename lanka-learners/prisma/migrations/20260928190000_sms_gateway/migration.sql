-- Keep a delivery trail for automatic client SMS notifications. Settings and
-- event switches continue to use the existing system_settings key/value table.
CREATE TABLE "sms_delivery_logs" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "providerMessageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_delivery_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sms_delivery_logs_event_createdAt_idx" ON "sms_delivery_logs"("event", "createdAt");
CREATE INDEX "sms_delivery_logs_status_createdAt_idx" ON "sms_delivery_logs"("status", "createdAt");
CREATE INDEX "sms_delivery_logs_entityType_entityId_idx" ON "sms_delivery_logs"("entityType", "entityId");
