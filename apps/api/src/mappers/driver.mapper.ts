import type { DriverProfile, DriverRatingSummary } from "@smart-dispatch/types";

type DriverRecord = {
  licenseNumber: string;
  licensePhotoUrl: string | null;
  licensePhotoBackUrl?: string | null;
  createdAt: Date;
};

const EMPTY_RATING: DriverRatingSummary = { average: null, count: 0 };

export function toPublicDriverProfile(
  driver: DriverRecord,
  rating?: DriverRatingSummary | null,
): DriverProfile {
  return {
    license_number: driver.licenseNumber,
    license_photo_url: driver.licensePhotoUrl,
    license_photo_back_url: driver.licensePhotoBackUrl ?? null,
    created_at: driver.createdAt.toISOString(),
    rating: rating ?? EMPTY_RATING,
  };
}
