import { Router, type Response } from "express";
import type { RideRequestStatus } from "@smart-dispatch/types";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toAdminRideRequest } from "../mappers/ride-request.mapper";
import {
  countRideRequestsAdmin,
  findRideRequestById,
  listRideRequestsAdmin,
  updateRideRequestStatusAdmin,
} from "../models/ride-request.model";
import { recordAuditLog } from "../services/audit-log.service";
import {
  getAdminRideRequestTargetStatus,
  validateAdminRideRequestAction,
  type AdminRideRequestAction,
} from "../services/ride-request-admin-policy.service";
import { parseRideRequestRejectionReason } from "../services/ride-request-rejection.service";
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

const ADMIN_ACTIONS = new Set<AdminRideRequestAction>(["confirm", "reject"]);

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

function parseAdminAction(value: unknown): AdminRideRequestAction | null {
  if (typeof value !== "string" || !ADMIN_ACTIONS.has(value as AdminRideRequestAction)) {
    return null;
  }

  return value as AdminRideRequestAction;
}

function mapAdminRideRequestList(
  rideRequests: Awaited<ReturnType<typeof listRideRequestsAdmin>>,
  locale?: string,
) {
  return rideRequests.map((rideRequest) => toAdminRideRequest(rideRequest, { locale }));
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
  "/:id/status",
  requirePermission("ride_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const actorUserId = req.user?.id;
      const rideRequestId = req.params.id;
      const action = parseAdminAction(req.body?.action);

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

      const validationError = validateAdminRideRequestAction(existing.status, action);
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
        summary:
          action === "confirm" ? "Ride request approved by admin" : "Ride request rejected by admin",
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
