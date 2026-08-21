-- Driver daily attendance records (one row per driver per work date).
CREATE TYPE "driver_attendance_status" AS ENUM ('present', 'absent', 'late', 'on_leave', 'off_duty');

CREATE TABLE "driver_attendances" (
    "id" UUID NOT NULL,
    "driver_user_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "status" "driver_attendance_status" NOT NULL,
    "check_in_at" TIMESTAMPTZ,
    "check_out_at" TIMESTAMPTZ,
    "notes" TEXT,
    "recorded_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "driver_attendances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "driver_attendances_driver_user_id_work_date_key" ON "driver_attendances"("driver_user_id", "work_date");

CREATE INDEX "driver_attendances_work_date_status_idx" ON "driver_attendances"("work_date", "status");

CREATE INDEX "driver_attendances_recorded_by_user_id_idx" ON "driver_attendances"("recorded_by_user_id");

ALTER TABLE "driver_attendances" ADD CONSTRAINT "driver_attendances_driver_user_id_fkey" FOREIGN KEY ("driver_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "driver_attendances" ADD CONSTRAINT "driver_attendances_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
