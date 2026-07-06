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
};

function formatDriverName(driver: DbDriver) {
  return [driver.firstName, driver.middleName, driver.lastName].filter(Boolean).join(" ");
}

export function toPublicVehicle(vehicle: DbVehicle, options?: { locale?: string }): Vehicle {
  const vehicleType = toPublicVehicleType(vehicle.vehicleType, { locale: options?.locale });
  const vehicleClass = toPublicVehicleClass(vehicle.vehicleClass, { locale: options?.locale });

  return {
    id: vehicle.id,
    plate_number: vehicle.plateNumber,
    chassis_number: vehicle.chassisNumber,
    vehicle_type_id: vehicle.vehicleTypeId,
    vehicle_type: {
      id: vehicleType.id,
      slug: vehicleType.slug,
      name: vehicleType.name,
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
