CREATE TABLE "registration_forms" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "translations" JSONB NOT NULL,
    "target_role_slug" VARCHAR(50),
    "fields" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "registration_forms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registration_forms_slug_key" ON "registration_forms"("slug");
CREATE INDEX "registration_forms_is_active_idx" ON "registration_forms"("is_active");
