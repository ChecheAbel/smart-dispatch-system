import { Router, type Response } from "express";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import {
  fetchUserNotifications,
  fetchUserUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendInAppNotification,
} from "../services/in-app-notification.service";
import { getOptionalString } from "../utils/validation";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";
import type { InAppNotificationCategory, InAppNotificationPriority } from "@smart-dispatch/types";

const router = Router();

router.use(authenticate);

/**
 * GET /api/user-notifications
 * Returns a paginated list of notifications for the authenticated user.
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized.", 401);
    }

    const parsedLimit = parseInt(String(req.query.limit || ""), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 30;

    const parsedOffset = parseInt(String(req.query.offset || ""), 10);
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    const unreadOnly = req.query.unreadOnly === "true" || req.query.unreadOnly === "1";
    const category =
      typeof req.query.category === "string" && req.query.category.trim()
        ? req.query.category.trim()
        : undefined;

    const result = await fetchUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
      category,
    });

    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

/**
 * GET /api/user-notifications/unread-count
 * Returns only the unread notification count for lightweight header polling/sync.
 */
router.get("/unread-count", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized.", 401);
    }

    const unreadCount = await fetchUserUnreadCount(userId);
    return sendSuccess(res, { unreadCount });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

/**
 * PATCH /api/user-notifications/:id/read
 * Marks a single notification as read for the authenticated user.
 */
router.patch("/:id/read", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized.", 401);
    }

    const notificationId = req.params.id;
    if (!notificationId) {
      return sendError(res, "Notification ID is required.", 400);
    }

    const updated = await markNotificationAsRead(notificationId, userId);
    if (!updated) {
      return sendError(res, "Notification not found.", 404);
    }

    return sendSuccess(res, { notification: updated });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

/**
 * POST /api/user-notifications/read-all
 * Marks all notifications as read for the authenticated user.
 */
router.post("/read-all", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized.", 401);
    }

    const count = await markAllNotificationsAsRead(userId);
    return sendSuccess(res, { updatedCount: count });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

/**
 * POST /api/user-notifications/test
 * Triggers a test notification for the authenticated user (for testing and UI demos).
 */
router.post("/test", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized.", 401);
    }

    const title = getOptionalString(req.body?.title) || "Smart Dispatch Notification";
    const message =
      getOptionalString(req.body?.message) ||
      "Real-time web notification test was delivered successfully.";
    const category = (getOptionalString(req.body?.category) || "system") as InAppNotificationCategory;
    const priority = (getOptionalString(req.body?.priority) || "medium") as InAppNotificationPriority;
    const actionUrl = getOptionalString(req.body?.actionUrl) || "/admin";

    const notification = await sendInAppNotification({
      userId,
      title,
      message,
      category,
      priority,
      actionUrl,
      sendPush: true,
    });

    return sendSuccess(
      res,
      { notification },
      { message: "Test notification dispatched successfully.", status: 201 },
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerUserNotificationRoutes(app: import("express").Express) {
  app.use("/api/user-notifications", router);
}
