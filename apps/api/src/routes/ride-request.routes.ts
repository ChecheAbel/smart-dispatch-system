import { Router, type Response } from "express";
import type { RideRequestStatus } from "@smart-dispatch/types";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { requirePermission } from "../middleware/require-permission";
import { toPublicRideRequest } from "../mappers/ride-request.mapper";
import { toPublicRegion } from "../mappers/region.mapper";
import { toRideRequestLocationOption } from "../mappers/location.mapper";
import { toPublicVehicleClass } from "../mappers/vehicle-class.mapper";
import { toPublicVehicleType } from "../mappers/vehicle-type.mapper";
import {
  cancelRideRequestForUser,
  countRideRequestsForUser,
  countRideRequestsForDriver,
  createRideRequest,
  findRideRequestForUser,
  listRideRequestsForDriver,
  listRideRequestsForUser,
  updateRideRequestForUser,
} from "../models/ride-request.model";
import { listVehicles } from "../models/vehicle.model";
import { toPublicVehicle } from "../mappers/vehicle.mapper";
import { listActiveRegions } from "../models/region.model";
import { listActiveBookingLocations } from "../models/location.model";
import { listActiveVehicleTypesWithAllowedClasses } from "../models/vehicle-type-class.model";
import { recordAuditLog } from "../services/audit-log.service";
import { queueRideRequestNotifications } from "../services/notification-dispatch.service";
import { parseRideRequestPayload } from "../services/ride-request-payload.service";
import { validateRideRequestReferences } from "../services/ride-request-reference.service";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

const RIDE_REQUEST_STATUSES = new Set<RideRequestStatus>([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

router.use(authenticate);

function getRequestLocale(req: AuthenticatedRequest) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parseStatusFilter(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const status = value.trim() as RideRequestStatus;
  return RIDE_REQUEST_STATUSES.has(status) ? status : undefined;
}

function mapRideRequestList(
  rideRequests: Awaited<ReturnType<typeof listRideRequestsForUser>>,
  locale?: string,
) {
  return rideRequests.map((rideRequest) => toPublicRideRequest(rideRequest, { locale }));
}

function mapRideRequestListForDriver(
  rideRequests: Awaited<ReturnType<typeof listRideRequestsForDriver>>,
  locale?: string,
) {
  return rideRequests.map((rideRequest) => toPublicRideRequest(rideRequest, { locale }));
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

      const pagination = parsePaginationQuery(req.query);
      const status = parseStatusFilter(req.query.status);
      const search = getOptionalString(req.query.search) ?? undefined;
      const filters = { requesterUserId: userId, status, search };

      const result = await paginate(
        pagination,
        () => countRideRequestsForUser(filters),
        (skip, take) => listRideRequestsForUser(filters, skip, take),
      );

      return sendPaginatedSuccess(res, mapRideRequestList(result.data, locale), result.pagination);
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/driver/vehicle",
  requirePermission("driver.vehicle"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const vehicles = await listVehicles(
        { assignedDriverUserId: userId },
        { skip: 0, take: 1 },
      );

      if (!vehicles.length) {
        return sendSuccess(res, { vehicle: null });
      }

      return sendSuccess(res, {
        vehicle: toPublicVehicle(vehicles[0], { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/driver/upcoming",
  requirePermission("driver.upcoming"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const pagination = parsePaginationQuery(req.query);
      const filters = { driverUserId: userId, upcoming: true as const };

      const result = await paginate(
        pagination,
        () => countRideRequestsForDriver(filters),
        (skip, take) => listRideRequestsForDriver(filters, skip, take),
      );

      return sendPaginatedSuccess(
        res,
        mapRideRequestListForDriver(result.data, locale),
        result.pagination,
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/driver/history",
  requirePermission("driver.history"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const pagination = parsePaginationQuery(req.query);
      const status = parseStatusFilter(req.query.status);

      if (status && status !== "completed" && status !== "cancelled") {
        return sendError(
          res,
          "History trips can only be filtered by completed or cancelled status.",
          400,
        );
      }

      const filters = { driverUserId: userId, history: true as const, status };

      const result = await paginate(
        pagination,
        () => countRideRequestsForDriver(filters),
        (skip, take) => listRideRequestsForDriver(filters, skip, take),
      );

      return sendPaginatedSuccess(
        res,
        mapRideRequestListForDriver(result.data, locale),
        result.pagination,
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/:id",
  requirePermission("customer_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      const rideRequestId = req.params.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const rideRequest = await findRideRequestForUser(rideRequestId, userId);
      if (!rideRequest) {
        return sendError(res, "Ride request not found.", 404);
      }

      return sendSuccess(res, {
        ride_request: toPublicRideRequest(rideRequest, { locale }),
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

      const parsed = parseRideRequestPayload(req.body);
      if (!parsed.ok) {
        return sendError(res, parsed.error, 400);
      }

      const referenceError = await validateRideRequestReferences(parsed.data);
      if (referenceError) {
        return sendError(res, referenceError, 400);
      }

      const rideRequest = await createRideRequest({
        requesterUserId: userId,
        vehicleTypeId: parsed.data.vehicleTypeId,
        vehicleClassId: parsed.data.vehicleClassId,
        regionId: parsed.data.regionId,
        pickupLocationId: parsed.data.pickupLocationId,
        dropoffLocationId: parsed.data.dropoffLocationId,
        pickupAddress: parsed.data.pickupAddress.trim(),
        pickupLatitude: parsed.data.pickupLatitude,
        pickupLongitude: parsed.data.pickupLongitude,
        dropoffAddress: parsed.data.dropoffAddress.trim(),
        dropoffLatitude: parsed.data.dropoffLatitude,
        dropoffLongitude: parsed.data.dropoffLongitude,
        scheduledAt: parsed.data.scheduledAt,
        passengerCount: parsed.data.passengerCount,
        notes: parsed.data.notes,
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

      queueRideRequestNotifications("created", rideRequest.id);

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

router.patch(
  "/:id",
  requirePermission("customer_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      const rideRequestId = req.params.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const parsed = parseRideRequestPayload(req.body);
      if (!parsed.ok) {
        return sendError(res, parsed.error, 400);
      }

      const referenceError = await validateRideRequestReferences(parsed.data);
      if (referenceError) {
        return sendError(res, referenceError, 400);
      }

      const result = await updateRideRequestForUser(rideRequestId, userId, {
        vehicleTypeId: parsed.data.vehicleTypeId,
        vehicleClassId: parsed.data.vehicleClassId,
        regionId: parsed.data.regionId,
        pickupLocationId: parsed.data.pickupLocationId,
        dropoffLocationId: parsed.data.dropoffLocationId,
        pickupAddress: parsed.data.pickupAddress.trim(),
        pickupLatitude: parsed.data.pickupLatitude,
        pickupLongitude: parsed.data.pickupLongitude,
        dropoffAddress: parsed.data.dropoffAddress.trim(),
        dropoffLatitude: parsed.data.dropoffLatitude,
        dropoffLongitude: parsed.data.dropoffLongitude,
        scheduledAt: parsed.data.scheduledAt,
        passengerCount: parsed.data.passengerCount,
        notes: parsed.data.notes,
      });

      if (!result) {
        return sendError(res, "Ride request not found.", 404);
      }

      if ("error" in result) {
        return sendError(res, result.error, 409);
      }

      await recordAuditLog({
        actorUserId: userId,
        action: "update",
        module: "customer_requests",
        entityType: "ride_request",
        entityId: result.id,
        entityLabel: `${result.pickupAddress} → ${result.dropoffAddress}`,
        summary: "Customer ride request updated",
        req,
      });

      return sendSuccess(res, {
        ride_request: toPublicRideRequest(result, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/:id/cancel",
  requirePermission("customer_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      const rideRequestId = req.params.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const result = await cancelRideRequestForUser(rideRequestId, userId);

      if (!result) {
        return sendError(res, "Ride request not found.", 404);
      }

      if ("error" in result) {
        return sendError(res, result.error, 409);
      }

      await recordAuditLog({
        actorUserId: userId,
        action: "update",
        module: "customer_requests",
        entityType: "ride_request",
        entityId: result.id,
        entityLabel: `${result.pickupAddress} → ${result.dropoffAddress}`,
        summary: "Customer ride request cancelled",
        req,
      });

      queueRideRequestNotifications("cancelled", result.id);

      return sendSuccess(res, {
        ride_request: toPublicRideRequest(result, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

export function registerRideRequestRoutes(app: import("express").Express) {
  app.use("/api/ride-requests", router);
}
