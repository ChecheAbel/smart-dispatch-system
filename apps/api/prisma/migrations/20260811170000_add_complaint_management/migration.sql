CREATE TYPE "complaint_category" AS ENUM ('trip', 'driver', 'vehicle', 'billing', 'service', 'other');
CREATE TYPE "complaint_priority" AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE "complaint_status" AS ENUM ('submitted', 'under_review', 'in_progress', 'resolved', 'closed', 'rejected');

CREATE TABLE "complaints" (
  "id" UUID NOT NULL,
  "reference_number" VARCHAR(30) NOT NULL,
  "requester_user_id" UUID NOT NULL,
  "ride_request_id" UUID,
  "assigned_to_user_id" UUID,
  "category" "complaint_category" NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "status" "complaint_status" NOT NULL DEFAULT 'submitted',
  "priority" "complaint_priority" NOT NULL DEFAULT 'medium',
  "admin_response" VARCHAR(2000),
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "complaints_reference_number_key" ON "complaints"("reference_number");
CREATE INDEX "complaints_requester_user_id_idx" ON "complaints"("requester_user_id");
CREATE INDEX "complaints_ride_request_id_idx" ON "complaints"("ride_request_id");
CREATE INDEX "complaints_assigned_to_user_id_idx" ON "complaints"("assigned_to_user_id");
CREATE INDEX "complaints_status_idx" ON "complaints"("status");
CREATE INDEX "complaints_priority_idx" ON "complaints"("priority");
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at" DESC);

ALTER TABLE "complaints" ADD CONSTRAINT "complaints_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
