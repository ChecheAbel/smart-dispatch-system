import { Router, type Response } from "express";
import type { AdminDispatchAutoAssignResult } from "@smart-dispatch/types";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { auditMutations } from "../middleware/audit-mutation";
import { requirePermission } from "../middleware/require-permission";
import { userHasPermission } from "../models/permission.model";
import { getAdminDispatchBoard, getAdminDispatchOverview } from "../models/dispatch-overview.model";
import { applyDispatchAutoAssignments } from "../services/dispatch-allocation.service";
import {
  isDispatchEscalationEnabled,
  runDispatchEscalationJob,
} from "../services/dispatch-escalation.service";
import { runRideRequestExpiryJob } from "../services/ride-request-expiry.service";
import {
  isTripDisruptionRerouteEnabled,
  rerouteDisruptedTrips,
} from "../services/trip-disruption.service";
import { parseLocale } from "../utils/locale";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"));

function parseRideRequestIds(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const ids = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return ids.length ? ids : undefined;
}

router.get("/overview", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized.", 401);
    }

    const [canReadRideRequests, canReadVehicles, canReadComplaints] = await Promise.all([
      userHasPermission(userId, "ride_requests.read"),
      userHasPermission(userId, "vehicles.read"),
      userHasPermission(userId, "complaints.read"),
    ]);

    if (!canReadRideRequests && !canReadComplaints) {
      return sendError(res, "You do not have access to dispatch overview.", 403);
    }

    if (canReadRideRequests) {
      await runRideRequestExpiryJob();
      await applyDispatchAutoAssignments({ actorUserId: userId, req });
      if (isTripDisruptionRerouteEnabled()) {
        await rerouteDisruptedTrips({ actorUserId: userId });
      }
      if (isDispatchEscalationEnabled()) {
        await runDispatchEscalationJob();
      }
    }

    const overview = await getAdminDispatchOverview({
      locale: parseLocale(req.query, req.headers["accept-language"]),
      includeRideRequests: canReadRideRequests,
      includeFleet: canReadVehicles,
      includeComplaints: canReadComplaints,
    });

    return sendSuccess(res, { overview });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/board", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized.", 401);
    }

    const [canReadRideRequests, canReadVehicles] = await Promise.all([
      userHasPermission(userId, "ride_requests.read"),
      userHasPermission(userId, "vehicles.read"),
    ]);

    if (!canReadRideRequests || !canReadVehicles) {
      return sendError(res, "You do not have access to the live dispatch board.", 403);
    }

    const board = await getAdminDispatchBoard(
      parseLocale(req.query, req.headers["accept-language"]),
    );

    return sendSuccess(res, { board });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post(
  "/auto-assign",
  requirePermission("ride_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const { assigned, skipped } = await applyDispatchAutoAssignments({
        rideRequestIds: parseRideRequestIds(req.body?.ride_request_ids),
        actorUserId,
        req,
      });

      const result: AdminDispatchAutoAssignResult = {
        assigned: assigned.length,
        skipped: skipped.length,
        results: [
          ...assigned.map((item) => ({
            ride_request_id: item.rideRequest.id,
            status: "assigned" as const,
            vehicle_plate: item.vehiclePlate,
          })),
          ...skipped.map((item) => ({
            ride_request_id: item.rideRequestId,
            status: "skipped" as const,
            reason: item.reason,
          })),
        ],
      };

      return sendSuccess(res, { result });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

export function registerDispatchOverviewRoutes(app: import("express").Express) {
  app.use("/api/admin/dispatch", router);
}
