-- Added in schema without a migration (commit 8c65070). Production never received this column.
ALTER TABLE "ride_requests" ADD COLUMN IF NOT EXISTS "scheduled_return_at" TIMESTAMPTZ;
