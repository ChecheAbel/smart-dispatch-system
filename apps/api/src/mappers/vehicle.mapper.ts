import type { Prisma } from "../generated/prisma";
import type { Vehicle } from "@smart-dispatch/types";
import { toPublicVehicleType } from "./vehicle-type.mapper";
import { toPublicVehicleClass } from "./vehicle-class.mapper";

type DbDriver = {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  mobileNumber: string;
};

type DbVehicle = {
  id: string;
  plateNumber: string;
  chassisNumber: string | null;
  vehicleTypeId: string;
  vehicleClassId: string;
  assignedDriverUserId: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: "active" | "maintenance" | "retired";
  notes: string | null;
  images: string[];
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceIssuedAt: Date | null;
  insuranceExpiresAt: Date | null;
  insuranceNotes: string | null;
  inspectionCenter: string | null;
  inspectionCertificateNumber: string | null;
  inspectionPerformedAt: Date | null;
  inspectionExpiresAt: Date | null;
  inspectionNotes: string | null;
  registrationExpiresAt: Date | null;
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
  };
  vehicleClass: {
    id: string;
    slug: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    translations: Prisma.JsonValue;
  };
  assignedDriver: DbDriver | null;
  _count?: {
    maintenanceLogs?: number;
  };
};

function formatDriverName(driver: DbDriver) {
  return [driver.firstName, driver.middleName, driver.lastName].filter(Boolean).join(" ");
}

function dateToIsoDate(value: Date | null) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function toPublicVehicle(
  vehicle: DbVehicle,
  options?: {
    locale?: string;
    openMaintenanceCount?: number;
    isAvailableNow?: boolean;
    availableFrom?: string | null;
  },
): Vehicle {
  const vehicleType = toPublicVehicleType(vehicle.vehicleType, { locale: options?.locale });
  const vehicleClass = toPublicVehicleClass(vehicle.vehicleClass, { locale: options?.locale });
  const isAvailableNow = options?.isAvailableNow ?? vehicle.status === "active";

  return {
    id: vehicle.id,
    plate_number: vehicle.plateNumber,
    chassis_number: vehicle.chassisNumber,
    vehicle_type_id: vehicle.vehicleTypeId,
    vehicle_type: {
      id: vehicleType.id,
      slug: vehicleType.slug,
      name: vehicleType.name,
      passenger_capacity: vehicleType.passenger_capacity,
    },
    vehicle_class_id: vehicle.vehicleClassId,
    vehicle_class: {
      id: vehicleClass.id,
      slug: vehicleClass.slug,
      name: vehicleClass.name,
    },
    assigned_driver_user_id: vehicle.assignedDriverUserId,
    assigned_driver: vehicle.assignedDriver
      ? {
          id: vehicle.assignedDriver.id,
          name: formatDriverName(vehicle.assignedDriver),
          email: vehicle.assignedDriver.email,
          mobile_number: vehicle.assignedDriver.mobileNumber,
        }
      : null,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    status: vehicle.status,
    notes: vehicle.notes,
    images: vehicle.images,
    insurance_provider: vehicle.insuranceProvider,
    insurance_policy_number: vehicle.insurancePolicyNumber,
    insurance_issued_at: dateToIsoDate(vehicle.insuranceIssuedAt),
    insurance_expires_at: dateToIsoDate(vehicle.insuranceExpiresAt),
    insurance_notes: vehicle.insuranceNotes,
    inspection_center: vehicle.inspectionCenter,
    inspection_certificate_number: vehicle.inspectionCertificateNumber,
    inspection_performed_at: dateToIsoDate(vehicle.inspectionPerformedAt),
    inspection_expires_at: dateToIsoDate(vehicle.inspectionExpiresAt),
    inspection_notes: vehicle.inspectionNotes,
    registration_expires_at: dateToIsoDate(vehicle.registrationExpiresAt),
    open_maintenance_count:
      options?.openMaintenanceCount ?? vehicle._count?.maintenanceLogs ?? undefined,
    is_available_now: isAvailableNow,
    available_from: isAvailableNow ? null : (options?.availableFrom ?? null),
    created_at: vehicle.createdAt.toISOString(),
    updated_at: vehicle.updatedAt.toISOString(),
  };
}

export function toPublicDriverOption(driver: DbDriver) {
  return {
    id: driver.id,
    name: formatDriverName(driver),
    email: driver.email,
    mobile_number: driver.mobileNumber,
  };
}
