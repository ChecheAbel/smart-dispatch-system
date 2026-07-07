import type { Prisma } from "../generated/prisma";
import type { AdminRideRequest, RideRequest } from "@smart-dispatch/types";
import { parseVehicleClassTranslationsMap } from "../types/vehicle-class-translations";
import { parseVehicleTypeTranslationsMap } from "../types/vehicle-type-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";
import { toPublicRegion } from "./region.mapper";
import { pickLocationName } from "./location.mapper";
import {
  canCancelRideRequest,
  canEditRideRequest,
  getRideRequestCancelDeadline,
} from "../services/ride-request-policy.service";
import {
  canAdminAssignRideRequest,
  canAdminCompleteRideRequest,
  canAdminConfirmRideRequest,
  canAdminRejectRideRequest,
  canAdminStartRideRequest,
  canAdminUnassignRideRequest,
  isRideRequestStartBlockedBySchedule,
} from "../services/ride-request-admin-policy.service";

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
  rejectionReason: string | null;
  assignedVehicleId: string | null;
  assignedDriverUserId: string | null;
  assignedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
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
  requester?: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string;
    mobileNumber: string;
  };
  assignedVehicle?: {
    id: string;
    plateNumber: string;
    make: string | null;
    model: string | null;
    vehicleType: DbRideRequest["vehicleType"];
    vehicleClass: DbRideRequest["vehicleClass"];
    assignedDriver: {
      id: string;
      firstName: string;
      middleName: string | null;
      lastName: string;
      email: string;
      mobileNumber: string;
    } | null;
  } | null;
  assignedDriver?: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string;
    mobileNumber: string;
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

function formatPersonName(parts: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(" ");
}

function mapAssignedDriver(
  driver: NonNullable<DbRideRequest["assignedDriver"]>,
) {
  return {
    id: driver.id,
    name: formatPersonName(driver),
    email: driver.email,
    mobile_number: driver.mobileNumber,
  };
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
    rejection_reason: rideRequest.rejectionReason,
    assigned_vehicle_id: rideRequest.assignedVehicleId,
    assigned_vehicle: rideRequest.assignedVehicle
      ? {
          id: rideRequest.assignedVehicle.id,
          plate_number: rideRequest.assignedVehicle.plateNumber,
          make: rideRequest.assignedVehicle.make,
          model: rideRequest.assignedVehicle.model,
          vehicle_type: rideRequest.assignedVehicle.vehicleType
            ? {
                id: rideRequest.assignedVehicle.vehicleType.id,
                slug: rideRequest.assignedVehicle.vehicleType.slug,
                name: pickTranslatedName(
                  rideRequest.assignedVehicle.vehicleType.translations,
                  rideRequest.assignedVehicle.vehicleType.slug,
                  locale,
                  parseVehicleTypeTranslationsMap,
                ),
              }
            : null,
          vehicle_class: rideRequest.assignedVehicle.vehicleClass
            ? {
                id: rideRequest.assignedVehicle.vehicleClass.id,
                slug: rideRequest.assignedVehicle.vehicleClass.slug,
                name: pickTranslatedName(
                  rideRequest.assignedVehicle.vehicleClass.translations,
                  rideRequest.assignedVehicle.vehicleClass.slug,
                  locale,
                  parseVehicleClassTranslationsMap,
                ),
              }
            : null,
        }
      : null,
    assigned_driver_user_id: rideRequest.assignedDriverUserId,
    assigned_driver: rideRequest.assignedDriver
      ? mapAssignedDriver(rideRequest.assignedDriver)
      : null,
    assigned_at: rideRequest.assignedAt?.toISOString() ?? null,
    started_at: rideRequest.startedAt?.toISOString() ?? null,
    completed_at: rideRequest.completedAt?.toISOString() ?? null,
    created_at: rideRequest.createdAt.toISOString(),
    updated_at: rideRequest.updatedAt.toISOString(),
    can_edit: canEditRideRequest(rideRequest.status),
    can_cancel: canCancelRideRequest(rideRequest.status, rideRequest.createdAt),
    cancel_deadline_at:
      rideRequest.status === "pending"
        ? getRideRequestCancelDeadline(rideRequest.createdAt).toISOString()
        : null,
  };
}

export function toAdminRideRequest(
  rideRequest: DbRideRequest,
  options?: { locale?: string },
): AdminRideRequest {
  const base = toPublicRideRequest(rideRequest, options);
  const hasAssignment = Boolean(rideRequest.assignedVehicleId);

  return {
    ...base,
    requester: rideRequest.requester
      ? {
          id: rideRequest.requester.id,
          first_name: rideRequest.requester.firstName,
          middle_name: rideRequest.requester.middleName,
          last_name: rideRequest.requester.lastName,
          email: rideRequest.requester.email,
          mobile_number: rideRequest.requester.mobileNumber,
        }
      : undefined,
    can_admin_confirm: canAdminConfirmRideRequest(rideRequest.status),
    can_admin_reject: canAdminRejectRideRequest(rideRequest.status),
    can_admin_assign: canAdminAssignRideRequest(rideRequest.status),
    can_admin_unassign: canAdminUnassignRideRequest(rideRequest.status, hasAssignment),
    can_admin_start: canAdminStartRideRequest(
      rideRequest.status,
      hasAssignment,
      rideRequest.scheduledAt,
    ),
    start_blocked_by_schedule: isRideRequestStartBlockedBySchedule(
      rideRequest.status,
      hasAssignment,
      rideRequest.scheduledAt,
    ),
    can_admin_complete: canAdminCompleteRideRequest(rideRequest.status),
  };
}
