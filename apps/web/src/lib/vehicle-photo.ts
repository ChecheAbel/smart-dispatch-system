export const VEHICLE_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const VEHICLE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export function validateVehiclePhoto(file: File | null): string | undefined {
  if (!file) {
    return "Vehicle photo is required.";
  }

  if (!VEHICLE_PHOTO_ACCEPT.split(",").includes(file.type)) {
    return "Upload a JPG, PNG, or WEBP image.";
  }

  if (file.size > VEHICLE_PHOTO_MAX_SIZE_BYTES) {
    return "Vehicle photo must be 5 MB or smaller.";
  }

  return undefined;
}

export function getVehiclePhotoUrl(path: string | null | undefined, apiBaseUrl?: string) {
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
