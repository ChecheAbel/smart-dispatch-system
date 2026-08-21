-- Store the back of a driver license separately from the front photo.
ALTER TABLE "drivers" ADD COLUMN "license_photo_back_url" VARCHAR(500);
