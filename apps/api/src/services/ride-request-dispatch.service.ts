import { findVehicleById } from "../models/vehicle.model";
import { findActiveRideRequestForVehicle } from "../models/ride-request.model";

type RideRequestForDispatch = {
  id: string;
  status: string;
  vehicleTypeId: string | null;
  vehicleClassId: string | null;
  assignedVehicleId: string | null;
};

export async function validateRideRequestVehicleAssignment(
  rideRequest: RideRequestForDispatch,
  vehicleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const vehicle = await findVehicleById(vehicleId);

  if (!vehicle) {
    return { ok: false, error: "Selected vehicle was not found." };
  }

  if (vehicle.status !== "active") {
    return { ok: false, error: "Only active vehicles can be assigned to a ride request." };
  }

  if (!vehicle.assignedDriverUserId || !vehicle.assignedDriver) {
    return { ok: false, error: "Selected vehicle must have an assigned driver." };
  }

  if (rideRequest.vehicleTypeId && vehicle.vehicleTypeId !== rideRequest.vehicleTypeId) {
    return { ok: false, error: "Selected vehicle type does not match this ride request." };
  }

  if (rideRequest.vehicleClassId && vehicle.vehicleClassId !== rideRequest.vehicleClassId) {
    return { ok: false, error: "Selected vehicle class does not match this ride request." };
  }

  const conflict = await findActiveRideRequestForVehicle(vehicleId, rideRequest.id);
  if (conflict) {
    return {
      ok: false,
      error: "This vehicle is already assigned to another active ride request.",
    };
  }

  return { ok: true };
}
