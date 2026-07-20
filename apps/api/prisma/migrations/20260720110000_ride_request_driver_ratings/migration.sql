-- CreateTable
CREATE TABLE "ride_request_driver_ratings" (
    "id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "driver_user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ride_request_driver_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ride_request_driver_ratings_ride_request_id_key" ON "ride_request_driver_ratings"("ride_request_id");

-- CreateIndex
CREATE INDEX "ride_request_driver_ratings_requester_user_id_idx" ON "ride_request_driver_ratings"("requester_user_id");

-- CreateIndex
CREATE INDEX "ride_request_driver_ratings_driver_user_id_idx" ON "ride_request_driver_ratings"("driver_user_id");

-- AddForeignKey
ALTER TABLE "ride_request_driver_ratings" ADD CONSTRAINT "ride_request_driver_ratings_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_request_driver_ratings" ADD CONSTRAINT "ride_request_driver_ratings_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_request_driver_ratings" ADD CONSTRAINT "ride_request_driver_ratings_driver_user_id_fkey" FOREIGN KEY ("driver_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
