CREATE TYPE "RequesterSegment" AS ENUM ('individual', 'business', 'government');

CREATE TABLE "requester_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "segment" "RequesterSegment" NOT NULL,
    "organization_name" VARCHAR(200),
    "job_title" VARCHAR(100),
    "organization_address" VARCHAR(500),
    "tax_id" VARCHAR(50),
    "registration_number" VARCHAR(50),
    "government_entity_type" VARCHAR(100),
    "official_reference" VARCHAR(100),
    "billing_contact_name" VARCHAR(100),
    "billing_contact_email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "requester_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requester_profiles_user_id_key" ON "requester_profiles"("user_id");
CREATE INDEX "requester_profiles_segment_idx" ON "requester_profiles"("segment");

ALTER TABLE "requester_profiles" ADD CONSTRAINT "requester_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
