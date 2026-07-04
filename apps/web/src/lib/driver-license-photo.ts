export const DRIVER_LICENSE_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const DRIVER_LICENSE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export function validateDriverLicensePhoto(file: File | null): string | undefined {
  if (!file) {
    return "Driver license photo is required.";
  }

  if (!DRIVER_LICENSE_PHOTO_ACCEPT.split(",").includes(file.type)) {
    return "Upload a JPG, PNG, or WEBP image.";
  }

  if (file.size > DRIVER_LICENSE_PHOTO_MAX_SIZE_BYTES) {
    return "Driver license photo must be 5 MB or smaller.";
  }

  return undefined;
}

export function getDriverLicensePhotoUrl(path: string | null | undefined, apiBaseUrl?: string) {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = (apiBaseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    "",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
