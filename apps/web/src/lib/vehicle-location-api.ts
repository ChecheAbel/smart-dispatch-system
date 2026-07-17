import type { ApiSuccessResponse, VehicleLocationSnapshot } from "@smart-dispatch/types";
import { apiClient } from "./api-client";

export async function fetchVehicleLocation(vehicleId: string) {
  const response = await apiClient.get<ApiSuccessResponse<{ location: VehicleLocationSnapshot | null }>>(
    `/api/vehicles/${vehicleId}/location`,
  );

  return response.data.data.location;
}
