import {
  findActiveContractsMatchingRideScope,
} from "../models/contract.model";
import {
  findRegionByIdIfActive,
  findVehicleClassByIdIfActive,
  findVehicleTypeByIdIfActive,
  isVehicleTypeClassAllowed,
} from "../models/ride-request.model";
import { findActiveLocationForBooking } from "../models/location.model";
import type { ParsedRideRequestPayload } from "./ride-request-payload.service";

export async function validateRideRequestReferences(payload: ParsedRideRequestPayload) {
  if (payload.vehicleClassId && !payload.vehicleTypeId) {
    return "Select a vehicle type before choosing a vehicle class.";
  }

  if (payload.vehicleTypeId) {
    const vehicleType = await findVehicleTypeByIdIfActive(payload.vehicleTypeId);
    if (!vehicleType) {
      return "Selected vehicle type is not available.";
    }
  }

  if (payload.vehicleClassId) {
    const vehicleClass = await findVehicleClassByIdIfActive(payload.vehicleClassId);
    if (!vehicleClass) {
      return "Selected vehicle class is not available.";
    }
  }

  if (payload.vehicleTypeId && payload.vehicleClassId) {
    const allowed = await isVehicleTypeClassAllowed(payload.vehicleTypeId, payload.vehicleClassId);
    if (!allowed) {
      return "Selected vehicle class is not allowed for this vehicle type.";
    }
  }

  if (payload.regionId) {
    const region = await findRegionByIdIfActive(payload.regionId);
    if (!region) {
      return "Selected region is not available.";
    }
  }

  if (payload.pickupLocationId) {
    const pickupLocation = await findActiveLocationForBooking(payload.pickupLocationId, "pickup");
    if (!pickupLocation) {
      return "Selected pickup location is not available.";
    }

    if (payload.regionId && pickupLocation.regionId !== payload.regionId) {
      return "Pickup location does not belong to the selected region.";
    }
  }

  if (payload.dropoffLocationId) {
    const dropoffLocation = await findActiveLocationForBooking(payload.dropoffLocationId, "dropoff");
    if (!dropoffLocation) {
      return "Selected drop-off location is not available.";
    }

    if (payload.regionId && dropoffLocation.regionId !== payload.regionId) {
      return "Drop-off location does not belong to the selected region.";
    }
  }

  if (payload.contractId) {
    const matchingContracts = await findActiveContractsMatchingRideScope({
      regionId: payload.regionId,
      vehicleTypeId: payload.vehicleTypeId,
      vehicleClassId: payload.vehicleClassId,
    });

    if (matchingContracts.length === 0) {
      return "No active contract covers this trip.";
    }

    if (!matchingContracts.some((contract) => contract.id === payload.contractId)) {
      return "This trip does not match the selected contract scope.";
    }
  }

  return null;
}
