const DRIVER_LICENSE_PATTERN = /^[A-Z0-9-]{5,30}$/;

export function normalizeDriverLicenseNumber(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!DRIVER_LICENSE_PATTERN.test(normalized)) {
    return "";
  }
  return normalized;
}

export function isValidDriverLicenseNumber(value: string) {
  return Boolean(normalizeDriverLicenseNumber(value));
}
