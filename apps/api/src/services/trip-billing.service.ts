import type { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { findActiveContractById } from "../models/contract.model";
import { findFarePlanById, resolveFarePlan } from "../models/fare-plan.model";
import {
  calculateFareAmount,
  computeTripDurationMinutes,
  resolveTripDistanceKm,
  type FarePlanRates,
} from "./fare-calculation.service";

type RideForBilling = {
  id: string;
  contractId: string | null;
  regionId: string | null;
  vehicleTypeId: string | null;
  vehicleClassId: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLatitude: Prisma.Decimal | null;
  pickupLongitude: Prisma.Decimal | null;
  dropoffLatitude: Prisma.Decimal | null;
  dropoffLongitude: Prisma.Decimal | null;
  startedAt: Date | null;
  completedAt: Date | null;
  farePlanId: string | null;
  distanceKm: Prisma.Decimal | null;
  durationMinutes: number | null;
  billableAmount: Prisma.Decimal | null;
  billableCurrency: string | null;
};

export type TripBillingSnapshot = {
  farePlanId: string;
  distanceKm: number;
  durationMinutes: number;
  billableAmount: number;
  billableCurrency: string;
  pricingSnapshot: Record<string, unknown>;
};

function toFarePlanRates(plan: {
  pricingModel: FarePlanRates["pricingModel"];
  currency: string;
  baseFare: Prisma.Decimal;
  perKmRate: Prisma.Decimal | null;
  perMinuteRate: Prisma.Decimal | null;
  minimumFare: Prisma.Decimal | null;
  bookingFee: Prisma.Decimal | null;
}): FarePlanRates {
  return {
    pricingModel: plan.pricingModel,
    currency: plan.currency,
    baseFare: plan.baseFare,
    perKmRate: plan.perKmRate,
    perMinuteRate: plan.perMinuteRate,
    minimumFare: plan.minimumFare,
    bookingFee: plan.bookingFee,
  };
}

async function resolvePlanForTrip(
  ride: RideForBilling,
  contractFarePlanId: string | null | undefined,
) {
  if (contractFarePlanId) {
    const contractPlan = await findFarePlanById(contractFarePlanId);
    if (contractPlan?.isActive) {
      return contractPlan;
    }
  }

  return resolveFarePlan({
    regionId: ride.regionId,
    vehicleTypeId: ride.vehicleTypeId,
    vehicleClassId: ride.vehicleClassId,
  });
}

export async function computeTripBillingSnapshot(
  ride: RideForBilling,
  contractFarePlanId?: string | null,
): Promise<TripBillingSnapshot | null> {
  if (!ride.contractId) {
    return null;
  }

  const plan = await resolvePlanForTrip(ride, contractFarePlanId);
  if (!plan) {
    throw new Error("FARE_PLAN_NOT_FOUND");
  }

  const distanceKm =
    ride.distanceKm != null ? Number(ride.distanceKm) : resolveTripDistanceKm(ride);
  const durationMinutes =
    ride.durationMinutes ??
    computeTripDurationMinutes(ride.startedAt, ride.completedAt ?? new Date());

  const calculated = calculateFareAmount(toFarePlanRates(plan), {
    distanceKm,
    durationMinutes,
  });

  return {
    farePlanId: plan.id,
    distanceKm: calculated.distanceKm,
    durationMinutes: calculated.durationMinutes,
    billableAmount: calculated.amount,
    billableCurrency: calculated.currency,
    pricingSnapshot: {
      pricing_model: plan.pricingModel,
      currency: plan.currency,
      base_fare: Number(plan.baseFare),
      per_km_rate: plan.perKmRate != null ? Number(plan.perKmRate) : null,
      per_minute_rate: plan.perMinuteRate != null ? Number(plan.perMinuteRate) : null,
      minimum_fare: plan.minimumFare != null ? Number(plan.minimumFare) : null,
      booking_fee: plan.bookingFee != null ? Number(plan.bookingFee) : null,
      breakdown: calculated.breakdown,
    },
  };
}

export async function ensureTripBillingSnapshot(
  rideRequestId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const ride = await client.rideRequest.findUnique({
    where: { id: rideRequestId },
  });

  if (!ride || ride.status !== "completed" || !ride.contractId) {
    return null;
  }

  if (ride.billableAmount != null && ride.farePlanId) {
    return {
      farePlanId: ride.farePlanId,
      distanceKm: ride.distanceKm != null ? Number(ride.distanceKm) : 0,
      durationMinutes: ride.durationMinutes ?? 0,
      billableAmount: Number(ride.billableAmount),
      billableCurrency: ride.billableCurrency ?? "ETB",
      pricingSnapshot: {},
    } satisfies TripBillingSnapshot;
  }

  const contract = await findActiveContractById(ride.contractId);
  const snapshot = await computeTripBillingSnapshot(ride, contract?.farePlanId);

  if (!snapshot) {
    return null;
  }

  await client.rideRequest.update({
    where: { id: ride.id },
    data: {
      farePlanId: snapshot.farePlanId,
      distanceKm: snapshot.distanceKm,
      durationMinutes: snapshot.durationMinutes,
      billableAmount: snapshot.billableAmount,
      billableCurrency: snapshot.billableCurrency,
    },
  });

  return snapshot;
}

export function buildLineItemDescription(ride: {
  pickupAddress: string;
  dropoffAddress: string;
  completedAt: Date | null;
}) {
  const dateLabel = ride.completedAt
    ? ride.completedAt.toISOString().slice(0, 10)
    : "Trip";
  return `${dateLabel}: ${ride.pickupAddress} → ${ride.dropoffAddress}`.slice(0, 500);
}
