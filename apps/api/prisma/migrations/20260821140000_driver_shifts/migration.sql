-- Named driver work shifts and one assignment per driver per work date.
CREATE TABLE "driver_shift_templates" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "driver_shift_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "driver_shift_templates_slug_key" ON "driver_shift_templates"("slug");

CREATE INDEX "driver_shift_templates_active_sort_order_idx" ON "driver_shift_templates"("active", "sort_order");

CREATE TABLE "driver_shift_assignments" (
    "id" UUID NOT NULL,
    "driver_user_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "shift_template_id" UUID NOT NULL,
    "notes" TEXT,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "driver_shift_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "driver_shift_assignments_driver_user_id_work_date_key" ON "driver_shift_assignments"("driver_user_id", "work_date");

CREATE INDEX "driver_shift_assignments_work_date_shift_template_id_idx" ON "driver_shift_assignments"("work_date", "shift_template_id");

CREATE INDEX "driver_shift_assignments_assigned_by_user_id_idx" ON "driver_shift_assignments"("assigned_by_user_id");

ALTER TABLE "driver_shift_assignments" ADD CONSTRAINT "driver_shift_assignments_driver_user_id_fkey" FOREIGN KEY ("driver_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "driver_shift_assignments" ADD CONSTRAINT "driver_shift_assignments_shift_template_id_fkey" FOREIGN KEY ("shift_template_id") REFERENCES "driver_shift_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "driver_shift_assignments" ADD CONSTRAINT "driver_shift_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
