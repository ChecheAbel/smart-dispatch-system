import { Router, type Response } from "express";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { userHasPermission } from "../models/permission.model";
import { getAdminDashboardAnalytics } from "../models/dashboard.model";
import { parseLocale } from "../utils/locale";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

const router = Router();

function parsePeriodDays(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(90, Math.max(7, Math.trunc(value)));
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(90, Math.max(7, Math.trunc(parsed)));
    }
  }

  return 30;
}

router.use(authenticate, authorize("admin"));

router.get("/analytics", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized.", 401);
    }

    const locale = parseLocale(req.query, req.headers["accept-language"]);
    const periodDays = parsePeriodDays(req.query.period_days);

    const [
      canReadRideRequests,
      canReadVehicles,
      canReadCompliance,
      canReadRegistrations,
    ] = await Promise.all([
      userHasPermission(userId, "ride_requests.read"),
      userHasPermission(userId, "vehicles.read"),
      userHasPermission(userId, "compliance.read"),
      userHasPermission(userId, "user_registrations.read"),
    ]);

    if (
      !canReadRideRequests &&
      !canReadVehicles &&
      !canReadCompliance &&
      !canReadRegistrations
    ) {
      return sendError(res, "You do not have access to dashboard reporting.", 403);
    }

    const analytics = await getAdminDashboardAnalytics({
      locale,
      periodDays,
      includeRideRequests: canReadRideRequests,
      includeFleet: canReadVehicles,
      includeCompliance: canReadCompliance || canReadVehicles,
      includeFuel: canReadVehicles,
      includeRegistrations: canReadRegistrations,
    });

    return sendSuccess(res, { analytics });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerAdminDashboardRoutes(app: import("express").Express) {
  app.use("/api/admin/dashboard", router);
}
