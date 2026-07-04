import type { DriverApplication } from "@smart-dispatch/types";

type DriverApplicationRecord = {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  mobileNumber: string;
  createdAt: Date;
  driverProfile: {
    licenseNumber: string;
    licensePhotoUrl: string | null;
  } | null;
};

export function toPublicDriverApplication(user: DriverApplicationRecord): DriverApplication {
  if (!user.driverProfile) {
    throw new Error("Driver application is missing driver profile data.");
  }

  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    middle_name: user.middleName,
    last_name: user.lastName,
    mobile_number: user.mobileNumber,
    license_number: user.driverProfile.licenseNumber,
    license_photo_url: user.driverProfile.licensePhotoUrl,
    submitted_at: user.createdAt.toISOString(),
  };
}
