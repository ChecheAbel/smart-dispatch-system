import type { DriverProfile } from "@smart-dispatch/types";

type DriverRecord = {
  licenseNumber: string;
  licensePhotoUrl: string | null;
  licensePhotoBackUrl?: string | null;
  createdAt: Date;
};

export function toPublicDriverProfile(driver: DriverRecord): DriverProfile {
  return {
    license_number: driver.licenseNumber,
    license_photo_url: driver.licensePhotoUrl,
    license_photo_back_url: driver.licensePhotoBackUrl ?? null,
    created_at: driver.createdAt.toISOString(),
  };
}
