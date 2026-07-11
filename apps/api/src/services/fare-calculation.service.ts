import type { PricingModel } from "@smart-dispatch/types";
import type { Prisma } from "../generated/prisma";

const EARTH_RADIUS_KM = 6371;

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type FarePlanRates = {
  pricingModel: PricingModel;
  currency: string;
  baseFare: Prisma.Decimal | number;
  perKmRate: Prisma.Decimal | number | null;
  perMinuteRate: Prisma.Decimal | number | null;
  minimumFare: Prisma.Decimal | number | null;
  bookingFee: Prisma.Decimal | number | null;
};

export type FareBreakdown = {
  baseComponent: number;
  distanceComponent: number;
  timeComponent: number;
  bookingFee: number;
  subtotal: number;
  minimumApplied: boolean;
};

export type CalculatedFare = {
  amount: number;
  currency: string;
  distanceKm: number;
  durationMinutes: number;
  breakdown: FareBreakdown;
};

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function haversineDistanceKm(origin: LatLng, destination: LatLng) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(destination.latitude - origin.latitude);
  const lngDelta = toRadians(destination.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const destinationLat = toRadians(destination.latitude);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(lngDelta / 2) ** 2;

  return roundMoney(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine)));
}

export function computeTripDurationMinutes(
  startedAt: Date | null | undefined,
  completedAt: Date | null | undefined,
) {
  if (!startedAt || !completedAt) {
    return 0;
  }

  const diffMs = completedAt.getTime() - startedAt.getTime();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(diffMs / 60_000));
}

export function resolveTripDistanceKm(ride: {
  pickupLatitude: Prisma.Decimal | null;
  pickupLongitude: Prisma.Decimal | null;
  dropoffLatitude: Prisma.Decimal | null;
  dropoffLongitude: Prisma.Decimal | null;
}) {
  if (
    ride.pickupLatitude == null ||
    ride.pickupLongitude == null ||
    ride.dropoffLatitude == null ||
    ride.dropoffLongitude == null
  ) {
    return 0;
  }

  return haversineDistanceKm(
    {
      latitude: Number(ride.pickupLatitude),
      longitude: Number(ride.pickupLongitude),
    },
    {
      latitude: Number(ride.dropoffLatitude),
      longitude: Number(ride.dropoffLongitude),
    },
  );
}

export function calculateFareAmount(
  plan: FarePlanRates,
  input: { distanceKm: number; durationMinutes: number },
): CalculatedFare {
  const baseFare = toNumber(plan.baseFare);
  const perKmRate = toNumber(plan.perKmRate);
  const perMinuteRate = toNumber(plan.perMinuteRate);
  const minimumFare = plan.minimumFare == null ? null : toNumber(plan.minimumFare);
  const bookingFee = toNumber(plan.bookingFee);

  let baseComponent = 0;
  let distanceComponent = 0;
  let timeComponent = 0;

  switch (plan.pricingModel) {
    case "flat":
      baseComponent = baseFare;
      break;
    case "distance":
      baseComponent = baseFare;
      distanceComponent = input.distanceKm * perKmRate;
      break;
    case "time":
      baseComponent = baseFare;
      timeComponent = input.durationMinutes * perMinuteRate;
      break;
    case "distance_time":
      baseComponent = baseFare;
      distanceComponent = input.distanceKm * perKmRate;
      timeComponent = input.durationMinutes * perMinuteRate;
      break;
    case "hourly": {
      const minimumMinutes =
        minimumFare != null && perMinuteRate > 0 ? minimumFare / perMinuteRate : 0;
      const billableMinutes = Math.max(input.durationMinutes, minimumMinutes);
      baseComponent = 0;
      timeComponent = billableMinutes * perMinuteRate;
      break;
    }
    default:
      baseComponent = baseFare;
      break;
  }

  const subtotalBeforeMinimum = baseComponent + distanceComponent + timeComponent + bookingFee;
  let amount = subtotalBeforeMinimum;
  let minimumApplied = false;

  if (plan.pricingModel !== "hourly" && minimumFare != null && amount < minimumFare) {
    amount = minimumFare;
    minimumApplied = true;
  }

  amount = roundMoney(amount);

  return {
    amount,
    currency: plan.currency.trim().toUpperCase() || "ETB",
    distanceKm: roundMoney(input.distanceKm),
    durationMinutes: input.durationMinutes,
    breakdown: {
      baseComponent: roundMoney(baseComponent),
      distanceComponent: roundMoney(distanceComponent),
      timeComponent: roundMoney(timeComponent),
      bookingFee: roundMoney(bookingFee),
      subtotal: roundMoney(subtotalBeforeMinimum),
      minimumApplied,
    },
  };
}
