import { Router, type Request, type Response } from "express";
import type { NotificationChannel } from "@smart-dispatch/types";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicNotificationConfiguration } from "../mappers/notification.mapper";
import {
  findNotificationConfigurationByChannel,
  upsertNotificationConfiguration,
} from "../models/notification.model";
import {
  sendAfroSmsTestMessage,
  SmsConfigurationError,
  SmsDeliveryError,
} from "../services/sms.service";
import { getOptionalString, parseBoolean } from "../utils/validation";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"));

const CHANNELS = new Set<NotificationChannel>(["email", "sms"]);

function parseChannel(value: string): NotificationChannel | null {
  return CHANNELS.has(value as NotificationChannel) ? (value as NotificationChannel) : null;
}

function parseSettings(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

router.post(
  "/:channel/test",
  requirePermission("notifications.write"),
  async (req: Request, res: Response) => {
    try {
      const channel = parseChannel(req.params.channel);
      if (channel !== "sms") {
        return sendError(res, "Test delivery is only supported for SMS.", 400);
      }

      const to = getOptionalString(req.body?.to);

      if (!to) {
        return sendError(res, "Recipient phone number is required.", 400);
      }

      const delivery = await sendAfroSmsTestMessage({ to });

      return sendSuccess(res, { delivery }, { message: "Test SMS sent successfully." });
    } catch (error) {
      if (error instanceof SmsConfigurationError || error instanceof SmsDeliveryError) {
        return sendError(res, error.message, 400);
      }

      return handleRouteError(res, error);
    }
  },
);

router.get("/:channel", requirePermission("notifications.read"), async (req: Request, res: Response) => {
  try {
    const channel = parseChannel(req.params.channel);
    if (!channel) {
      return sendError(res, "Invalid notification channel.", 400);
    }

    const config = await findNotificationConfigurationByChannel(channel);
    if (!config) {
      return sendError(res, "Notification configuration not found.", 404);
    }

    return sendSuccess(res, {
      configuration: toPublicNotificationConfiguration(config),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:channel", requirePermission("notifications.write"), async (req: Request, res: Response) => {
  try {
    const channel = parseChannel(req.params.channel);
    if (!channel) {
      return sendError(res, "Invalid notification channel.", 400);
    }

    const provider = getOptionalString(req.body?.provider);
    if (channel === "sms" && provider && provider !== "afrosms") {
      return sendError(res, "Only AfroSMS is supported for SMS configuration.", 400);
    }

    const settings = parseSettings(req.body?.settings);
    if (channel === "sms" && settings) {
      settings.api_url = settings.api_url ?? "https://api.afromessage.com/api/send";
    }

    const config = await upsertNotificationConfiguration(channel, {
      ...(req.body?.is_enabled !== undefined
        ? { isEnabled: parseBoolean(req.body.is_enabled) ?? false }
        : {}),
      ...(req.body?.provider !== undefined ? { provider: provider ?? "afrosms" } : {}),
      ...(req.body?.from_email !== undefined
        ? { fromEmail: getOptionalString(req.body.from_email) }
        : {}),
      ...(req.body?.from_name !== undefined
        ? { fromName: getOptionalString(req.body.from_name) }
        : {}),
      ...(req.body?.reply_to !== undefined
        ? { replyTo: getOptionalString(req.body.reply_to) }
        : {}),
      ...(req.body?.sender_id !== undefined
        ? { senderId: getOptionalString(req.body.sender_id) }
        : {}),
      ...(req.body?.settings !== undefined ? { settings } : {}),
    });

    return sendSuccess(res, {
      configuration: toPublicNotificationConfiguration(config),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerNotificationRoutes(app: import("express").Express) {
  app.use("/api/notifications", router);
}
