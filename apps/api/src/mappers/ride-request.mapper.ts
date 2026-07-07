import type { Prisma } from "../generated/prisma";
import type { RideRequest } from "@smart-dispatch/types";
import { parseVehicleClassTranslationsMap } from "../types/vehicle-class-translations";
import { parseVehicleTypeTranslationsMap } from "../types/vehicle-type-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";
import { toPublicRegion } from "./region.mapper";
import { pickLocationName } from "./location.mapper";

type DbRideRequest = {
  id: string;
  requesterUserId: string;
  vehicleTypeId: string | null;
  vehicleClassId: string | null;
  regionId: string | null;
  pickupLocationId: string | null;
  dropoffLocationId: string | null;
  pickupAddress: string;
  pickupLatitude: Prisma.Decimal | null;
  pickupLongitude: Prisma.Decimal | null;
  dropoffAddress: string;
  dropoffLatitude: Prisma.Decimal | null;
  dropoffLongitude: Prisma.Decimal | null;
  scheduledAt: Date | null;
  passengerCount: number;
  notes: string | null;
  status: RideRequest["status"];
  createdAt: Date;
  updatedAt: Date;
  vehicleType: {
    id: string;
    slug: string;
    passengerCapacity: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    translations: Prisma.JsonValue;
  } | null;
  vehicleClass: {
    id: string;
    slug: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    translations: Prisma.JsonValue;
  } | null;
  region: {
    id: string;
    slug: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    translations: Prisma.JsonValue;
  } | null;
  pickupLocation: {
    id: string;
    translations: Prisma.JsonValue;
  } | null;
  dropoffLocation: {
    id: string;
    translations: Prisma.JsonValue;
  } | null;
};

function decimalToNumber(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value);
}

function pickTranslatedName(
  translations: Prisma.JsonValue,
  slug: string,
  locale?: string,
  parser: (value: Prisma.JsonValue) => Record<string, { name: string }> = () => ({}),
) {
  const map = parser(translations);
  const normalizedLocale = normalizeLocale(locale) ?? DEFAULT_LOCALE;
  return map[normalizedLocale]?.name ?? map[DEFAULT_LOCALE]?.name ?? slug;
}

export function toPublicRideRequest(
  rideRequest: DbRideRequest,
  options?: { locale?: string },
): RideRequest {
  const locale = options?.locale;

  return {
    id: rideRequest.id,
    requester_user_id: rideRequest.requesterUserId,
    vehicle_type_id: rideRequest.vehicleTypeId,
    vehicle_type: rideRequest.vehicleType
      ? {
          id: rideRequest.vehicleType.id,
          slug: rideRequest.vehicleType.slug,
          name: pickTranslatedName(
            rideRequest.vehicleType.translations,
            rideRequest.vehicleType.slug,
            locale,
            parseVehicleTypeTranslationsMap,
          ),
        }
      : null,
    vehicle_class_id: rideRequest.vehicleClassId,
    vehicle_class: rideRequest.vehicleClass
      ? {
          id: rideRequest.vehicleClass.id,
          slug: rideRequest.vehicleClass.slug,
          name: pickTranslatedName(
            rideRequest.vehicleClass.translations,
            rideRequest.vehicleClass.slug,
            locale,
            parseVehicleClassTranslationsMap,
          ),
        }
      : null,
    region_id: rideRequest.regionId,
    region: rideRequest.region
      ? {
          id: rideRequest.region.id,
          slug: rideRequest.region.slug,
          name: toPublicRegion(rideRequest.region, { locale }).name,
        }
      : null,
    pickup_location_id: rideRequest.pickupLocationId,
    pickup_location: rideRequest.pickupLocation
      ? {
          id: rideRequest.pickupLocation.id,
          name: pickLocationName(rideRequest.pickupLocation.translations, locale),
        }
      : null,
    pickup_address: rideRequest.pickupAddress,
    pickup_latitude: decimalToNumber(rideRequest.pickupLatitude),
    pickup_longitude: decimalToNumber(rideRequest.pickupLongitude),
    dropoff_location_id: rideRequest.dropoffLocationId,
    dropoff_location: rideRequest.dropoffLocation
      ? {
          id: rideRequest.dropoffLocation.id,
          name: pickLocationName(rideRequest.dropoffLocation.translations, locale),
        }
      : null,
    dropoff_address: rideRequest.dropoffAddress,
    dropoff_latitude: decimalToNumber(rideRequest.dropoffLatitude),
    dropoff_longitude: decimalToNumber(rideRequest.dropoffLongitude),
    scheduled_at: rideRequest.scheduledAt?.toISOString() ?? null,
    passenger_count: rideRequest.passengerCount,
    notes: rideRequest.notes,
    status: rideRequest.status,
    created_at: rideRequest.createdAt.toISOString(),
    updated_at: rideRequest.updatedAt.toISOString(),
  };
}
