import { Router, type Request, type Response } from "express";
import type {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationModule,
} from "@smart-dispatch/types";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicNotificationDeliveryLog } from "../mappers/notification-delivery-log.mapper";
import {
  countNotificationDeliveryLogs,
  findNotificationDeliveryLogById,
  listNotificationDeliveryLogs,
} from "../models/notification-delivery-log.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { getOptionalString, getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"));

const STATUSES = new Set<NotificationDeliveryStatus>(["sent", "skipped", "failed"]);
const MODULES = new Set<NotificationModule>([
  "ride_requests",
  "user_registrations",
  "insurance",
  "inspection",
]);
const CHANNELS = new Set<NotificationChannel>(["email", "sms"]);

function parseStatus(value: unknown): NotificationDeliveryStatus | undefined {
  const status = getOptionalString(value);
  return status && STATUSES.has(status as NotificationDeliveryStatus)
    ? (status as NotificationDeliveryStatus)
    : undefined;
}

function parseModule(value: unknown): NotificationModule | undefined {
  const module = getOptionalString(value);
  return module && MODULES.has(module as NotificationModule)
    ? (module as NotificationModule)
    : undefined;
}

function parseChannel(value: unknown): NotificationChannel | undefined {
  const channel = getOptionalString(value);
  return channel && CHANNELS.has(channel as NotificationChannel)
    ? (channel as NotificationChannel)
    : undefined;
}

function parseDate(value: unknown) {
  const raw = getOptionalString(value);
  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === true || value === "true" || value === "1") {
    return true;
  }

  if (value === false || value === "false" || value === "0") {
    return false;
  }

  return undefined;
}

router.get("/", requirePermission("notifications.read"), async (req: Request, res: Response) => {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      status: parseStatus(req.query.status),
      module: parseModule(req.query.module),
      channel: parseChannel(req.query.channel),
      event: getOptionalString(req.query.event) || undefined,
      isTest: parseBoolean(req.query.is_test),
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
    };

    const result = await paginate(
      pagination,
      () => countNotificationDeliveryLogs(filter),
      (skip, take) => listNotificationDeliveryLogs(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((log) => toPublicNotificationDeliveryLog(log)),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("notifications.read"), async (req: Request, res: Response) => {
  try {
    const log = await findNotificationDeliveryLogById(req.params.id);
    if (!log) {
      return sendError(res, "Notification delivery log not found.", 404);
    }

    return sendSuccess(res, {
      delivery_log: toPublicNotificationDeliveryLog(log),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerNotificationDeliveryLogRoutes(app: import("express").Express) {
  app.use("/api/notification-delivery-logs", router);
}
