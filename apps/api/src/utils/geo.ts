export type LatLng = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(origin: LatLng, destination: LatLng) {
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLng = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function isPointInCircle(
  point: LatLng,
  center: LatLng,
  radiusMeters: number,
) {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return false;
  }

  return haversineDistanceMeters(point, center) <= radiusMeters;
}

/** Ray-casting point-in-polygon. Coordinates are [lat, lng] vertices. */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]) {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersects =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}
