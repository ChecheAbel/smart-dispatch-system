import { listVehicleOperationalBusyState } from "../models/ride-request.model";
import {
  listVehicles,
  countVehicles,
  type ListVehiclesFilter,
} from "../models/vehicle.model";
import { listVehicleTypes } from "../models/vehicle-type.model";
import { listVehicleClasses } from "../models/vehicle-class.model";
import { toPublicVehicle } from "../mappers/vehicle.mapper";
import { toPublicVehicleType } from "../mappers/vehicle-type.mapper";
import { toPublicVehicleClass } from "../mappers/vehicle-class.mapper";

export type PublicVehiclesQueryParams = {
  page?: string | number;
  limit?: string | number;
  search?: string;
  vehicle_type_id?: string;
  vehicle_class_id?: string;
  availability?: string; // "all" | "available" | "busy"
  locale?: string;
};

export async function getPublicVehiclesCatalog(params: PublicVehiclesQueryParams = {}) {
  const locale = params.locale;
  const page = Math.max(1, parseInt(String(params.page || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || "12"), 10) || 12));
  const skip = (page - 1) * limit;
  const take = limit;

  // Real-time operational busy state from active/confirmed ride requests
  const busyState = await listVehicleOperationalBusyState();
  const busyVehicleIds = Array.from(busyState.keys());

  let idIn: string[] | undefined;
  let idNotIn: string[] | undefined;

  const availability = params.availability?.toLowerCase();
  if (availability === "available") {
    idNotIn = busyVehicleIds;
  } else if (availability === "busy") {
    idIn = busyVehicleIds;
  }

  const filter: ListVehiclesFilter = {
    search: params.search?.trim() || undefined,
    vehicleTypeId:
      params.vehicle_type_id && params.vehicle_type_id !== "all-types-placeholder"
        ? params.vehicle_type_id
        : undefined,
    vehicleClassId:
      params.vehicle_class_id && params.vehicle_class_id !== "all-classes-placeholder"
        ? params.vehicle_class_id
        : undefined,
    status: availability === "available" ? "active" : undefined,
    idIn,
    idNotIn,
  };

  const [vehicles, total, types, classes] = await Promise.all([
    listVehicles(filter, { skip, take }),
    countVehicles(filter),
    listVehicleTypes({}),
    listVehicleClasses({}),
  ]);

  const totalPages = Math.ceil(total / take) || 1;

  return {
    vehicles: vehicles.map((v) => {
      const isBusy = busyState.has(v.id);
      const availableFrom = busyState.get(v.id) ?? null;
      return toPublicVehicle(v, {
        locale,
        isAvailableNow: v.status === "active" && !isBusy,
        availableFrom: availableFrom ? availableFrom.toISOString() : null,
      });
    }),
    types: types.map((t) => toPublicVehicleType(t, { locale })),
    classes: classes.map((c) => toPublicVehicleClass(c, { locale })),
    pagination: {
      page,
      limit: take,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
