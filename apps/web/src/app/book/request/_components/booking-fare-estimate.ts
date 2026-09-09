/**
 * Real-time Ethiopian Birr (ETB) Fare & Demurrage Estimator
 * Based on Ethiopian transport standards with 15% standard VAT.
 */

export interface BookingFareEstimateInput {
  distanceKm: number;
  durationMinutes: number;
  standbyMinutes: number;
  vehicleClassSlug?: string;
  vehicleCount?: number;
}

export interface BookingFareEstimateResult {
  baseFare: number;
  distanceFare: number;
  standbyFee: number;
  subtotal: number;
  vatAmount: number;
  totalFare: number;
  currency: string;
}

const VAT_RATE = 0.15; // 15% Ethiopian standard VAT

export function calculateBookingFareEstimate(
  input: BookingFareEstimateInput,
): BookingFareEstimateResult {
  const count = Math.max(1, input.vehicleCount ?? 1);
  const distance = Math.max(0, input.distanceKm);
  const standby = Math.max(0, input.standbyMinutes);

  // Determine base and per-km rates based on vehicle tier
  const isPremium =
    input.vehicleClassSlug?.includes("vip") ||
    input.vehicleClassSlug?.includes("luxury") ||
    input.vehicleClassSlug?.includes("executive");

  const isVanOrBus =
    input.vehicleClassSlug?.includes("van") ||
    input.vehicleClassSlug?.includes("bus") ||
    input.vehicleClassSlug?.includes("shuttle");

  let basePerVehicle = 450; // ETB base flag drop
  let ratePerKm = 60; // ETB per km
  let waitingPerMin = 10; // ETB per standby minute

  if (isPremium) {
    basePerVehicle = 750;
    ratePerKm = 95;
    waitingPerMin = 15;
  } else if (isVanOrBus) {
    basePerVehicle = 900;
    ratePerKm = 80;
    waitingPerMin = 12;
  }

  // First 15 minutes of standby are complimentary
  const billableStandbyMinutes = Math.max(0, standby - 15);

  const baseFare = basePerVehicle * count;
  const distanceFare = distance > 0 ? Math.round(distance * ratePerKm * count) : 0;
  const standbyFee = billableStandbyMinutes * waitingPerMin * count;

  const subtotal = baseFare + distanceFare + standbyFee;
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100;
  const totalFare = subtotal + vatAmount;

  return {
    baseFare,
    distanceFare,
    standbyFee,
    subtotal,
    vatAmount,
    totalFare,
    currency: "ETB",
  };
}

export function formatEtb(amount: number): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}
