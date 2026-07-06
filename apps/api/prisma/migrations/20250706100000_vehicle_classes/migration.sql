-- CreateTable
CREATE TABLE "vehicle_classes" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "translations" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicle_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_classes_slug_key" ON "vehicle_classes"("slug");
