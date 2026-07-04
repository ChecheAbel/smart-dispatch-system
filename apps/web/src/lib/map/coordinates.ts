export const DEFAULT_MAP_CENTER = {
  latitude: 8.9806,
  longitude: 38.7578,
} as const;

export const DEFAULT_MAP_ZOOM = 13;

export function isValidLatitude(value?: number) {
  return value !== undefined && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value?: number) {
  return value !== undefined && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidCoordinatePair(latitude?: number, longitude?: number) {
  return isValidLatitude(latitude) && isValidLongitude(longitude);
}

export function formatCoordinate(value: number, fractionDigits = 6) {
  return value.toFixed(fractionDigits);
}

export function formatCoordinatePair(latitude: number, longitude: number) {
  return `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;
}
