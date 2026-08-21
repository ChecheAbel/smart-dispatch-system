import type { DriverPerformance, DriverProfile, DriverRatingSummary } from "@smart-dispatch/types";

type DriverRecord = {
  licenseNumber: string;
  licensePhotoUrl: string | null;
  licensePhotoBackUrl?: string | null;
  createdAt: Date;
};

const EMPTY_RATING: DriverRatingSummary = { average: null, count: 0 };

export const EMPTY_DRIVER_PERFORMANCE: DriverPerformance = {
  trips_assigned: 0,
  trips_completed: 0,
  trips_no_show: 0,
  completion_rate: null,
  on_time_rate: null,
  complaints: 0,
  attendance_rate: null,
};

export function toPublicDriverProfile(
  driver: DriverRecord,
  rating?: DriverRatingSummary | null,
  performance?: DriverPerformance | null,
): DriverProfile {
  return {
    license_number: driver.licenseNumber,
    license_photo_url: driver.licensePhotoUrl,
    license_photo_back_url: driver.licensePhotoBackUrl ?? null,
    created_at: driver.createdAt.toISOString(),
    rating: rating ?? EMPTY_RATING,
    performance: performance ?? EMPTY_DRIVER_PERFORMANCE,
  };
}
