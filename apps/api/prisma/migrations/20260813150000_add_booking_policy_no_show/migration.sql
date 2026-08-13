-- AlterTable
ALTER TABLE "booking_policies"
ADD COLUMN "no_show_type" "late_cancellation_type" NOT NULL DEFAULT 'none',
ADD COLUMN "no_show_fee" DECIMAL(12, 2);
