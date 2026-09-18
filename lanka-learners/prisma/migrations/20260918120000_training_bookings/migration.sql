-- Training bookings: a standalone day planner of two-person time slots.
CREATE TYPE "BookingSlot" AS ENUM ('SLOT_0800', 'SLOT_0900', 'SLOT_1000', 'SLOT_1130', 'SLOT_1230', 'SLOT_1400', 'SLOT_1500', 'SLOT_1600');
CREATE TYPE "BookingAttendance" AS ENUM ('PENDING', 'PRESENT', 'ABSENT');

ALTER TYPE "AuditAction" ADD VALUE 'CREATE_TRAINING_BOOKING';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_TRAINING_BOOKING';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_BOOKING_ATTENDANCE';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_TRAINING_BOOKING';

CREATE TABLE "training_bookings" (
    "id" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "slot" "BookingSlot" NOT NULL,
    "seat" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "attendance" "BookingAttendance" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_bookings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "training_bookings_seat_check" CHECK ("seat" IN (1, 2))
);

CREATE UNIQUE INDEX "training_bookings_bookingDate_slot_seat_key" ON "training_bookings"("bookingDate", "slot", "seat");
CREATE INDEX "training_bookings_bookingDate_idx" ON "training_bookings"("bookingDate");

ALTER TABLE "training_bookings" ADD CONSTRAINT "training_bookings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "training_bookings" ADD CONSTRAINT "training_bookings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
