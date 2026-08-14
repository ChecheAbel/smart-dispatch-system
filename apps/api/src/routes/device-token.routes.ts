import { Router, type Response } from "express";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { requirePermission } from "../middleware/require-permission";
import {
  isPushNotificationConfigured,
  registerDeviceToken,
  toPushTarget,
  PushNotificationConfigurationError,
  PushNotificationDeliveryError,
  type PushDevicePlatform,
} from "../services/push-notification.service";
import { getOptionalString } from "../utils/validation";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

const router = Router();

const PLATFORMS = new Set<PushDevicePlatform>(["android", "ios"]);

function parsePlatform(value: unknown): PushDevicePlatform | null {
  if (typeof value !== "string") {
    return null;
  }

  const platform = value.trim().toLowerCase();
  return PLATFORMS.has(platform as PushDevicePlatform) ? (platform as PushDevicePlatform) : null;
}

router.post(
  "/tokens",
  authenticate,
  requirePermission("devices.register"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      if (!isPushNotificationConfigured()) {
        return sendError(
          res,
          "Push notifications are not configured. Set NOTIFICATION_BROADCAST_URL and NOTIFICATION_APPLICATION_ID.",
          400,
        );
      }

      const token = getOptionalString(req.body?.token);
      const platform = parsePlatform(req.body?.platform);
      const requestedClientId = getOptionalString(req.body?.clientId);

      if (!token) {
        return sendError(res, "token is required.", 400);
      }

      if (!platform) {
        return sendError(res, "platform must be android or ios.", 400);
      }

      const clientId = toPushTarget(userId);
      if (requestedClientId && requestedClientId !== clientId) {
        return sendError(res, "clientId must match the authenticated user.", 403);
      }

      const device = await registerDeviceToken({
        clientId,
        token,
        platform,
      });

      return sendSuccess(
        res,
        { device },
        { message: "Device token registered successfully.", status: 201 },
      );
    } catch (error) {
      if (
        error instanceof PushNotificationConfigurationError ||
        error instanceof PushNotificationDeliveryError
      ) {
        return sendError(res, error.message, 400);
      }

      return handleRouteError(res, error);
    }
  },
);

export function registerDeviceTokenRoutes(app: import("express").Express) {
  app.use("/api/devices", router);
}
