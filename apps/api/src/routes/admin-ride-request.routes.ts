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
  updateRideRequestStatusAdmin,
} from "../models/ride-request.model";
import { recordAuditLog } from "../services/audit-log.service";
import {
  canAdminAssignRideRequest,
  canAdminUnassignRideRequest,
  getAdminRideRequestTargetStatus,
  validateAdminRideRequestStatusAction,
  type AdminRideRequestStatusAction,
} from "../services/ride-request-admin-policy.service";
import { validateRideRequestVehicleAssignment } from "../services/ride-request-dispatch.service";
import { parseRideRequestRejectionReason } from "../services/ride-request-rejection.service";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString, getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

const RIDE_REQUEST_STATUSES = new Set<RideRequestStatus>([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

const ADMIN_STATUS_ACTIONS = new Set<AdminRideRequestStatusAction>([
  "confirm",
  "reject",
  "start",
  "complete",
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

router.get(
  "/",
  requirePermission("ride_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const pagination = parsePaginationQuery(req.query);
      const status = parseStatusFilter(req.query.status);
      const search = getOptionalString(req.query.search) ?? undefined;
      const filters = { status, search };

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

      return sendSuccess(res, {
        ride_request: toAdminRideRequest(updated, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/:id/status",
  requirePermission("ride_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const actorUserId = req.user?.id;
      const rideRequestId = req.params.id;
      const action = parseAdminStatusAction(req.body?.action);

      if (!actorUserId) {
        return sendError(res, "Unauthorized.", 401);
      }

      if (!action) {
        return sendError(res, "A valid action is required.", 400);
      }

      const existing = await findRideRequestById(rideRequestId);
      if (!existing) {
        return sendError(res, "Ride request not found.", 404);
      }

      const validationError = validateAdminRideRequestStatusAction(existing.status, action, {
        hasAssignment: Boolean(existing.assignedVehicleId),
        scheduledAt: existing.scheduledAt,
      });
      if (validationError) {
        return sendError(res, validationError, 409);
      }

      let rejectionReason: string | null = null;

      if (action === "reject") {
        const parsedReason = parseRideRequestRejectionReason(req.body?.rejection_reason);
        if (!parsedReason.ok) {
          return sendError(res, parsedReason.error, 400);
        }
        rejectionReason = parsedReason.reason;
      }

      const nextStatus = getAdminRideRequestTargetStatus(action);
      const updated = await updateRideRequestStatusAdmin(rideRequestId, nextStatus, {
        rejectionReason,
      });

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
        summary: getStatusActionSummary(action),
        req,
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
