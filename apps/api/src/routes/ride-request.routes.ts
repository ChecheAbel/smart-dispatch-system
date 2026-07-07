import { Router, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { requirePermission } from "../middleware/require-permission";
import { toPublicRideRequest } from "../mappers/ride-request.mapper";
import { toPublicRegion } from "../mappers/region.mapper";
import { toRideRequestLocationOption } from "../mappers/location.mapper";
import { toPublicVehicleClass } from "../mappers/vehicle-class.mapper";
import { toPublicVehicleType } from "../mappers/vehicle-type.mapper";
import {
  createRideRequest,
  findRegionByIdIfActive,
  findVehicleClassByIdIfActive,
  findVehicleTypeByIdIfActive,
  listRideRequestsForUser,
} from "../models/ride-request.model";
import { listActiveRegions } from "../models/region.model";
import { listActiveBookingLocations, findActiveLocationForBooking } from "../models/location.model";
import { isVehicleTypeClassAllowed, listActiveVehicleTypesWithAllowedClasses } from "../models/vehicle-type-class.model";
import { recordAuditLog } from "../services/audit-log.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString, getString } from "../utils/validation";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate);

function getRequestLocale(req: AuthenticatedRequest) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parseCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function parsePassengerCount(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 50) {
    return undefined;
  }

  return value;
}

function parseScheduledAt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

router.get(
  "/form-options",
  requirePermission("customer_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const regionId = getOptionalString(req.query.region_id);
      const [vehicleTypes, regions, pickupLocations, dropoffLocations] = await Promise.all([
        listActiveVehicleTypesWithAllowedClasses(),
        listActiveRegions(),
        listActiveBookingLocations({ regionId: regionId ?? undefined, canPickup: true }),
        listActiveBookingLocations({ regionId: regionId ?? undefined, canDropoff: true }),
      ]);

      return sendSuccess(res, {
        vehicle_types: vehicleTypes.map((vehicleType) => ({
          ...toPublicVehicleType(vehicleType, { locale }),
          allowed_classes: vehicleType.vehicleClassLinks
            .map((link) => toPublicVehicleClass(link.vehicleClass, { locale }))
            .sort((left, right) => left.name.localeCompare(right.name)),
        })),
        regions: regions.map((region) => toPublicRegion(region, { locale })),
        pickup_locations: pickupLocations.map((location) =>
          toRideRequestLocationOption(location, { locale }),
        ),
        dropoff_locations: dropoffLocations.map((location) =>
          toRideRequestLocationOption(location, { locale }),
        ),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/",
  requirePermission("customer_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const rideRequests = await listRideRequestsForUser(userId);

      return sendSuccess(res, {
        ride_requests: rideRequests.map((rideRequest) =>
          toPublicRideRequest(rideRequest, { locale }),
        ),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/",
  requirePermission("customer_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const pickupAddress = getString(req.body?.pickup_address);
      const dropoffAddress = getString(req.body?.dropoff_address);
      const vehicleTypeId = getOptionalString(req.body?.vehicle_type_id);
      const vehicleClassId = getOptionalString(req.body?.vehicle_class_id);
      const regionId = getOptionalString(req.body?.region_id);
      const pickupLocationId = getOptionalString(req.body?.pickup_location_id);
      const dropoffLocationId = getOptionalString(req.body?.dropoff_location_id);
      const notes = getOptionalString(req.body?.notes);
      const passengerCount = parsePassengerCount(req.body?.passenger_count) ?? 1;
      const pickupLatitude = parseCoordinate(req.body?.pickup_latitude);
      const pickupLongitude = parseCoordinate(req.body?.pickup_longitude);
      const dropoffLatitude = parseCoordinate(req.body?.dropoff_latitude);
      const dropoffLongitude = parseCoordinate(req.body?.dropoff_longitude);
      const scheduledAt = parseScheduledAt(req.body?.scheduled_at);

      if (!pickupAddress) {
        return sendError(res, "Pickup address is required.", 400);
      }

      if (!dropoffAddress) {
        return sendError(res, "Drop-off address is required.", 400);
      }

      if (
        pickupLatitude === undefined ||
        pickupLongitude === undefined ||
        dropoffLatitude === undefined ||
        dropoffLongitude === undefined ||
        scheduledAt === undefined
      ) {
        return sendError(res, "One or more request fields are invalid.", 400);
      }

      if (vehicleClassId && !vehicleTypeId) {
        return sendError(res, "Select a vehicle type before choosing a vehicle class.", 400);
      }

      if (vehicleTypeId) {
        const vehicleType = await findVehicleTypeByIdIfActive(vehicleTypeId);
        if (!vehicleType) {
          return sendError(res, "Selected vehicle type is not available.", 400);
        }
      }

      if (vehicleClassId) {
        const vehicleClass = await findVehicleClassByIdIfActive(vehicleClassId);
        if (!vehicleClass) {
          return sendError(res, "Selected vehicle class is not available.", 400);
        }
      }

      if (vehicleTypeId && vehicleClassId) {
        const allowed = await isVehicleTypeClassAllowed(vehicleTypeId, vehicleClassId);
        if (!allowed) {
          return sendError(res, "Selected vehicle class is not allowed for this vehicle type.", 400);
        }
      }

      if (regionId) {
        const region = await findRegionByIdIfActive(regionId);
        if (!region) {
          return sendError(res, "Selected region is not available.", 400);
        }
      }

      if (pickupLocationId) {
        const pickupLocation = await findActiveLocationForBooking(pickupLocationId, "pickup");
        if (!pickupLocation) {
          return sendError(res, "Selected pickup location is not available.", 400);
        }

        if (regionId && pickupLocation.regionId !== regionId) {
          return sendError(res, "Pickup location does not belong to the selected region.", 400);
        }
      }

      if (dropoffLocationId) {
        const dropoffLocation = await findActiveLocationForBooking(dropoffLocationId, "dropoff");
        if (!dropoffLocation) {
          return sendError(res, "Selected drop-off location is not available.", 400);
        }

        if (regionId && dropoffLocation.regionId !== regionId) {
          return sendError(res, "Drop-off location does not belong to the selected region.", 400);
        }
      }

      const rideRequest = await createRideRequest({
        requesterUserId: userId,
        vehicleTypeId: vehicleTypeId ?? null,
        vehicleClassId: vehicleClassId ?? null,
        regionId: regionId ?? null,
        pickupLocationId: pickupLocationId ?? null,
        dropoffLocationId: dropoffLocationId ?? null,
        pickupAddress: pickupAddress.trim(),
        pickupLatitude,
        pickupLongitude,
        dropoffAddress: dropoffAddress.trim(),
        dropoffLatitude,
        dropoffLongitude,
        scheduledAt,
        passengerCount,
        notes: notes ?? null,
      });

      await recordAuditLog({
        actorUserId: userId,
        action: "create",
        module: "customer_requests",
        entityType: "ride_request",
        entityId: rideRequest.id,
        entityLabel: `${rideRequest.pickupAddress} → ${rideRequest.dropoffAddress}`,
        summary: "Customer ride request submitted",
        req,
      });

      return sendSuccess(
        res,
        { ride_request: toPublicRideRequest(rideRequest, { locale }) },
        { status: 201, message: "Ride request submitted successfully." },
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

export function registerRideRequestRoutes(app: import("express").Express) {
  app.use("/api/ride-requests", router);
}
