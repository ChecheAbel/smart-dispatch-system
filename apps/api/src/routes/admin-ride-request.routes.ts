import { Router, type Response } from "express";
import type { RideRequestStatus } from "@smart-dispatch/types";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toAdminRideRequest } from "../mappers/ride-request.mapper";
import { toPublicVehicle } from "../mappers/vehicle.mapper";
import {
  assignRideRequestAdmin,
  countRideRequestsAdmin,
  findRideRequestById,
  listAssignableVehiclesForRideRequest,
  listRideRequestsAdmin,
  unassignRideRequestAdmin,
} from "../models/ride-request.model";
import { recordAuditLog } from "../services/audit-log.service";
import {
  canAdminAssignRideRequest,
  canAdminUnassignRideRequest,
} from "../services/ride-request-admin-policy.service";
import { validateRideRequestVehicleAssignment } from "../services/ride-request-dispatch.service";
import { queueRideRequestNotifications } from "../services/notification-dispatch.service";
import { syncDriverUpcomingTripsAfterChange } from "../services/driver-upcoming-trips-sync.service";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString, getString, parseBoolean } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

const RIDE_REQUEST_STATUSES = new Set<RideRequestStatus>([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

router.use(authenticate, authorize("admin"));

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

function parseAdminStatusAction(value: unknown): AdminRideRequestStatusAction | null {
  if (typeof value !== "string" || !ADMIN_STATUS_ACTIONS.has(value as AdminRideRequestStatusAction)) {
    return null;
  }

  return value as AdminRideRequestStatusAction;
}

function mapAdminRideRequestList(
  rideRequests: Awaited<ReturnType<typeof listRideRequestsAdmin>>,
  locale?: string,
) {
  return rideRequests.map((rideRequest) => toAdminRideRequest(rideRequest, { locale }));
}

function getStatusActionSummary(action: AdminRideRequestStatusAction) {
  switch (action) {
    case "confirm":
      return "Ride request approved by admin";
    case "reject":
      return "Ride request rejected by admin";
    case "start":
      return "Ride request trip started by admin";
    case "complete":
      return "Ride request trip completed by admin";
  }
}

function getRideRequestSnapshot(
  rideRequest: NonNullable<Awaited<ReturnType<typeof findRideRequestById>>>,
) {
  return {
    id: rideRequest.id,
    assignedDriverUserId: rideRequest.assignedDriverUserId,
    status: rideRequest.status,
  };
}

router.get(
  "/",
  requirePermission("ride_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const pagination = parsePaginationQuery(req.query);
      const status = parseStatusFilter(req.query.status);
      const search = getOptionalString(req.query.search) ?? undefined;
      const upcoming = parseBoolean(req.query.upcoming) === true;
      const filters = { status, search, upcoming: upcoming || undefined };

      const result = await paginate(
        pagination,
        () => countRideRequestsAdmin(filters),
        (skip, take) => listRideRequestsAdmin(filters, skip, take),
      );

      return sendPaginatedSuccess(res, mapAdminRideRequestList(result.data, locale), result.pagination);
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/:id/assignable-vehicles",
  requirePermission("ride_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const rideRequest = await findRideRequestById(req.params.id);

      if (!rideRequest) {
        return sendError(res, "Ride request not found.", 404);
      }

      if (!canAdminAssignRideRequest(rideRequest.status) && !rideRequest.assignedVehicleId) {
        return sendError(res, "Vehicles can only be listed for confirmed ride requests.", 409);
      }

      const search = getOptionalString(req.query.search) ?? undefined;
      const vehicles = await listAssignableVehiclesForRideRequest(rideRequest, { search });

      return sendSuccess(res, {
        vehicles: vehicles.map((vehicle) => toPublicVehicle(vehicle, { locale })),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/:id",
  requirePermission("ride_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const rideRequest = await findRideRequestById(req.params.id);

      if (!rideRequest) {
        return sendError(res, "Ride request not found.", 404);
      }

      return sendSuccess(res, {
        ride_request: toAdminRideRequest(rideRequest, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/:id/assign",
  requirePermission("ride_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const actorUserId = req.user?.id;
      const rideRequestId = req.params.id;
      const vehicleId = getString(req.body?.vehicle_id);

      if (!actorUserId) {
        return sendError(res, "Unauthorized.", 401);
      }

      if (!vehicleId) {
        return sendError(res, "A vehicle is required.", 400);
      }

      const existing = await findRideRequestById(rideRequestId);
      if (!existing) {
        return sendError(res, "Ride request not found.", 404);
      }

      if (!canAdminAssignRideRequest(existing.status)) {
        return sendError(res, "Only confirmed ride requests can be assigned.", 409);
      }

      const validation = await validateRideRequestVehicleAssignment(existing, vehicleId);
      if (!validation.ok) {
        return sendError(res, validation.error, 409);
      }

      const updated = await assignRideRequestAdmin(rideRequestId, vehicleId);
      if (!updated) {
        return sendError(res, "Unable to assign the selected vehicle.", 409);
      }

      await recordAuditLog({
        actorUserId,
        action: "assign",
        module: "ride_requests",
        entityType: "ride_request",
        entityId: updated.id,
        entityLabel: `${updated.pickupAddress} → ${updated.dropoffAddress}`,
        summary: "Vehicle and driver assigned to ride request",
        req,
      });

      queueRideRequestNotifications("assigned", updated.id);

      syncDriverUpcomingTripsAfterChange({
        before: getRideRequestSnapshot(existing),
        after: updated,
      });

      return sendSuccess(res, {
        ride_request: toAdminRideRequest(updated, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/:id/unassign",
  requirePermission("ride_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const actorUserId = req.user?.id;
      const rideRequestId = req.params.id;

      if (!actorUserId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const existing = await findRideRequestById(rideRequestId);
      if (!existing) {
        return sendError(res, "Ride request not found.", 404);
      }

      if (!canAdminUnassignRideRequest(existing.status, Boolean(existing.assignedVehicleId))) {
        return sendError(res, "Only confirmed assigned ride requests can be unassigned.", 409);
      }

      const updated = await unassignRideRequestAdmin(rideRequestId);
      if (!updated) {
        return sendError(res, "Ride request not found.", 404);
      }

      await recordAuditLog({
        actorUserId,
        action: "update",
        module: "ride_requests",
        entityType: "ride_request",
        entityId: updated.id,
        entityLabel: `${updated.pickupAddress} → ${updated.dropoffAddress}`,
        summary: "Vehicle and driver unassigned from ride request",
        req,
      });

      syncDriverUpcomingTripsAfterChange({
        before: getRideRequestSnapshot(existing),
        after: updated,
      });

      return sendSuccess(res, {
        ride_request: toAdminRideRequest(updated, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);


export function registerAdminRideRequestRoutes(app: import("express").Express) {
  app.use("/api/admin/ride-requests", router);
}
