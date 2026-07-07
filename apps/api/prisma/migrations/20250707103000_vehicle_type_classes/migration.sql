CREATE TABLE "vehicle_type_classes" (
    "vehicle_type_id" UUID NOT NULL,
    "vehicle_class_id" UUID NOT NULL,

    CONSTRAINT "vehicle_type_classes_pkey" PRIMARY KEY ("vehicle_type_id","vehicle_class_id")
);

ALTER TABLE "ride_requests" ADD COLUMN "vehicle_class_id" UUID;

ALTER TABLE "vehicle_type_classes" ADD CONSTRAINT "vehicle_type_classes_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_type_classes" ADD CONSTRAINT "vehicle_type_classes_vehicle_class_id_fkey" FOREIGN KEY ("vehicle_class_id") REFERENCES "vehicle_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_vehicle_class_id_fkey" FOREIGN KEY ("vehicle_class_id") REFERENCES "vehicle_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "vehicle_type_classes_vehicle_class_id_idx" ON "vehicle_type_classes"("vehicle_class_id");
CREATE INDEX "ride_requests_vehicle_class_id_idx" ON "ride_requests"("vehicle_class_id");
