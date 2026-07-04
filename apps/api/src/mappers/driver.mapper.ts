import type { DriverProfile } from "@smart-dispatch/types";

type DriverRecord = {
  licenseNumber: string;
  licensePhotoUrl: string | null;
};

export function toPublicDriverProfile(driver: DriverRecord): DriverProfile {
  return {
    license_number: driver.licenseNumber,
    license_photo_url: driver.licensePhotoUrl,
  };
}
