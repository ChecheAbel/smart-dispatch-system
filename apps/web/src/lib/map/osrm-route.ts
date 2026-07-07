export type LatLngPoint = {
  latitude: number;
  longitude: number;
};

export type DrivingRouteResult = {
  path: LatLngPoint[];
  distanceMeters: number;
  durationSeconds: number;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineDistanceMeters(origin: LatLngPoint, destination: LatLngPoint) {
  const originLat = (origin.latitude * Math.PI) / 180;
  const destinationLat = (destination.latitude * Math.PI) / 180;
  const deltaLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const deltaLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function formatRouteDistance(meters: number, locale: string) {
  const kilometers = meters / 1000;

  if (kilometers >= 1) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: kilometers >= 10 ? 0 : 1,
    }).format(kilometers);
  }

  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(meters);
}

export function formatRouteDuration(seconds: number, locale: string) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${new Intl.NumberFormat(locale).format(minutes)} min`;
}

export async function fetchDrivingRoute(
  origin: LatLngPoint,
  destination: LatLngPoint,
  signal?: AbortSignal,
): Promise<DrivingRouteResult> {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error("Failed to fetch driving route.");
  }

  const data = (await response.json()) as OsrmRouteResponse;
  const route = data.routes?.[0];
  const routeCoordinates = route?.geometry?.coordinates;

  if (
    data.code !== "Ok" ||
    !route ||
    !routeCoordinates?.length ||
    route.distance == null ||
    route.duration == null
  ) {
    throw new Error("No driving route found.");
  }

  return {
    path: routeCoordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

/** @deprecated Use fetchDrivingRoute instead. */
export async function fetchDrivingRoutePath(
  origin: LatLngPoint,
  destination: LatLngPoint,
  signal?: AbortSignal,
): Promise<LatLngPoint[]> {
  const route = await fetchDrivingRoute(origin, destination, signal);
  return route.path;
}
