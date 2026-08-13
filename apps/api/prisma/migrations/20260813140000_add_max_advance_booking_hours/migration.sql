-- AlterTable
ALTER TABLE "booking_policies"
ADD COLUMN "max_advance_booking_hours" INTEGER NOT NULL DEFAULT 720;
