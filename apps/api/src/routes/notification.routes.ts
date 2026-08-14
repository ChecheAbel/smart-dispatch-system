import { Router, type Request, type Response } from "express";
import type { NotificationChannel, NotificationModule } from "@smart-dispatch/types";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicNotificationConfiguration } from "../mappers/notification.mapper";
import { toPublicNotificationTemplate } from "../mappers/notification-template.mapper";
import {
  findNotificationConfigurationByChannel,
  upsertNotificationConfiguration,
} from "../models/notification.model";
import {
  findNotificationTemplateById,
  listNotificationTemplates,
  updateNotificationTemplate,
} from "../models/notification-template.model";
import { queueNotificationDeliveryLog } from "../models/notification-delivery-log.model";
import {
  sendAfroSmsTestMessage,
  SmsConfigurationError,
  SmsDeliveryError,
} from "../services/sms.service";
import {
  sendNotificationTemplateTest,
  validateNotificationTemplateInput,
  EmailConfigurationError,
  EmailDeliveryError,
} from "../services/notification-dispatch.service";
import {
  broadcastPushNotification,
  isPushNotificationConfigured,
  toPushTarget,
  PUSH_TEST_MESSAGE,
  PUSH_TEST_TITLE,
  PushNotificationConfigurationError,
  PushNotificationDeliveryError,
} from "../services/push-notification.service";
import {
  OutboundMessageError,
  parseOutboundAudience,
  parseOutboundChannels,
  resolveOutboundRecipients,
  sendAdminOutboundMessage,
} from "../services/admin-outbound-message.service";
import { getOptionalString, getStringArray, parseBoolean } from "../utils/validation";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

const CHANNELS = new Set<NotificationChannel>(["email", "sms"]);
const MODULES = new Set<NotificationModule>([
  "ride_requests",
  "user_registrations",
  "insurance",
  "inspection",
  "invoices",
  "password_reset",
]);

function parseChannel(value: string): NotificationChannel | null {
  return CHANNELS.has(value as NotificationChannel) ? (value as NotificationChannel) : null;
}

function parseModule(value: unknown): NotificationModule | undefined {
  if (typeof value !== "string" || !MODULES.has(value as NotificationModule)) {
    return undefined;
  }

  return value as NotificationModule;
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

async function resolvePushBroadcastTargets(input: {
  userIds: string[];
  audience?: string | null;
}) {
  const recipients = await resolveOutboundRecipients(input);
  return recipients.map((recipient) => recipient.id);
}

router.get(
  "/templates",
  requirePermission("notifications.read"),
  async (req: Request, res: Response) => {
    try {
      const module = parseModule(req.query.module);
      const templates = await listNotificationTemplates(module);

      return sendSuccess(res, {
        templates: templates.map(toPublicNotificationTemplate),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.put(
  "/templates",
  requirePermission("notifications.write"),
  async (req: Request, res: Response) => {
    try {
      const items = Array.isArray(req.body?.templates) ? req.body.templates : null;
      if (!items) {
        return sendError(res, "A templates array is required.", 400);
      }

      const updatedTemplates = [];

      for (const item of items) {
        const id = getOptionalString(item?.id);
        if (!id) {
          return sendError(res, "Each template must include an id.", 400);
        }

        const existing = await findNotificationTemplateById(id);
        if (!existing) {
          return sendError(res, "One or more notification templates were not found.", 404);
        }

        const nextEnabled =
          item?.is_enabled !== undefined
            ? (parseBoolean(item.is_enabled) ?? false)
            : existing.isEnabled;
        const nextSubject =
          item?.subject !== undefined ? getOptionalString(item.subject) ?? null : existing.subject;
        const nextBody =
          item?.body !== undefined ? getOptionalString(item.body) ?? "" : existing.body;

        if (existing.channel !== "email" && existing.channel !== "sms" && existing.channel !== "push") {
          return sendError(res, "Invalid notification template channel.", 400);
        }

        const validationError = validateNotificationTemplateInput({
          module: existing.module as NotificationModule,
          channel: existing.channel,
          isEnabled: nextEnabled,
          subject: nextSubject,
          body: nextBody,
        });

        if (validationError) {
          return sendError(res, validationError, 400);
        }

        const updated = await updateNotificationTemplate(id, {
          isEnabled: nextEnabled,
          subject: nextSubject,
          body: nextBody,
        });

        updatedTemplates.push(updated);
      }

      return sendSuccess(res, {
        templates: updatedTemplates.map(toPublicNotificationTemplate),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/push/status",
  requirePermission("notifications.read"),
  async (_req: Request, res: Response) => {
    return sendSuccess(res, {
      configured: isPushNotificationConfigured(),
    });
  },
);

router.post(
  "/push/broadcast",
  requirePermission("notifications.write"),
  async (req: Request, res: Response) => {
    try {
      if (!isPushNotificationConfigured()) {
        return sendError(
          res,
          "Push notifications are not configured. Set NOTIFICATION_BROADCAST_URL and NOTIFICATION_APPLICATION_ID.",
          400,
        );
      }

      const audience = getOptionalString(req.body?.audience);
      const userIds = getStringArray(req.body?.user_ids);
      const title = getOptionalString(req.body?.title);
      const message = getOptionalString(req.body?.message);

      if (!title) {
        return sendError(res, "Title is required.", 400);
      }

      if (!message) {
        return sendError(res, "Message is required.", 400);
      }

      if (title.length > 80) {
        return sendError(res, "Title must be 80 characters or fewer.", 400);
      }

      if (message.length > 500) {
        return sendError(res, "Message must be 500 characters or fewer.", 400);
      }

      const targets = await resolvePushBroadcastTargets({ userIds, audience });
      if (targets.length === 0) {
        return sendError(res, "Select at least one recipient or audience.", 400);
      }

      if (targets.length > 500) {
        return sendError(res, "A broadcast can include at most 500 recipients.", 400);
      }

      const delivery = await broadcastPushNotification({
        targets: targets.map((userId) => toPushTarget(userId)),
        title,
        message,
        persistence: "temporary",
        channels: ["websocket", "fcm"],
        data: { source: "admin.broadcast", type: "admin.broadcast" },
      });

      queueNotificationDeliveryLog({
        status: "sent",
        module: "system",
        event: "admin.broadcast",
        channel: "push",
        recipient: "requester",
        entityType: "test",
        recipientContact: `${targets.length} user target(s)`,
        subject: title,
        bodyPreview: message,
        isTest: false,
      });

      return sendSuccess(
        res,
        { delivery, recipient_count: targets.length },
        { message: "Push notification sent successfully." },
      );
    } catch (error) {
      if (
        error instanceof PushNotificationConfigurationError ||
        error instanceof PushNotificationDeliveryError
      ) {
        queueNotificationDeliveryLog({
          status: "failed",
          module: "system",
          event: "admin.broadcast",
          channel: "push",
          recipient: "requester",
          entityType: "test",
          subject: getOptionalString(req.body?.title),
          bodyPreview: getOptionalString(req.body?.message),
          errorMessage: error.message,
          isTest: false,
        });
        return sendError(res, error.message, 400);
      }

      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/send",
  requirePermission("notifications.write"),
  async (req: Request, res: Response) => {
    try {
      const channels = parseOutboundChannels(getStringArray(req.body?.channels));
      const audience = parseOutboundAudience(getOptionalString(req.body?.audience));
      const userIds = getStringArray(req.body?.user_ids);
      const title = getOptionalString(req.body?.title) ?? "";
      const message = getOptionalString(req.body?.message);

      if (channels.length === 0) {
        return sendError(res, "Select at least one channel.", 400);
      }

      if (!message) {
        return sendError(res, "Message is required.", 400);
      }

      const needsTitle = channels.includes("email") || channels.includes("push");
      if (needsTitle && !title.trim()) {
        return sendError(res, "Title is required for email and push.", 400);
      }

      if (title.length > 80) {
        return sendError(res, "Title must be 80 characters or fewer.", 400);
      }

      if (message.length > 500) {
        return sendError(res, "Message must be 500 characters or fewer.", 400);
      }

      const delivery = await sendAdminOutboundMessage({
        channels,
        audience,
        userIds,
        title: title.trim(),
        message,
      });

      return sendSuccess(
        res,
        {
          recipient_count: delivery.recipientCount,
          results: delivery.results,
        },
        { message: "Message sent." },
      );
    } catch (error) {
      if (
        error instanceof OutboundMessageError ||
        error instanceof EmailConfigurationError ||
        error instanceof EmailDeliveryError ||
        error instanceof SmsConfigurationError ||
        error instanceof SmsDeliveryError ||
        error instanceof PushNotificationConfigurationError ||
        error instanceof PushNotificationDeliveryError
      ) {
        const status = error instanceof OutboundMessageError ? error.statusCode : 400;
        return sendError(res, error.message, status);
      }

      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/push/test",
  requirePermission("notifications.write"),
  async (req: Request, res: Response) => {
    try {
      if (!isPushNotificationConfigured()) {
        return sendError(
          res,
          "Push notifications are not configured. Set NOTIFICATION_BROADCAST_URL and NOTIFICATION_APPLICATION_ID.",
          400,
        );
      }

      const userId = getOptionalString(req.body?.user_id);
      const title = PUSH_TEST_TITLE;
      const message = PUSH_TEST_MESSAGE;

      if (!userId) {
        return sendError(res, "user_id is required.", 400);
      }

      const delivery = await broadcastPushNotification({
        targets: [toPushTarget(userId)],
        title,
        message,
        persistence: "temporary",
        channels: ["websocket", "fcm"],
        data: { source: "smart-dispatch-test" },
      });

      queueNotificationDeliveryLog({
        status: "sent",
        module: "system",
        event: "test.push",
        channel: "push",
        recipient: "requester",
        entityType: "test",
        entityId: userId,
        recipientContact: toPushTarget(userId),
        subject: title,
        bodyPreview: message,
        isTest: true,
      });

      return sendSuccess(res, { delivery }, { message: "Test push notification sent successfully." });
    } catch (error) {
      if (
        error instanceof PushNotificationConfigurationError ||
        error instanceof PushNotificationDeliveryError
      ) {
        const userId = getOptionalString(req.body?.user_id);
        queueNotificationDeliveryLog({
          status: "failed",
          module: "system",
          event: "test.push",
          channel: "push",
          recipient: "requester",
          entityType: "test",
          entityId: userId,
          recipientContact: userId ? toPushTarget(userId) : null,
          subject: PUSH_TEST_TITLE,
          bodyPreview: PUSH_TEST_MESSAGE,
          errorMessage: error.message,
          isTest: true,
        });
        return sendError(res, error.message, 400);
      }

      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/templates/:id/test",
  requirePermission("notifications.write"),
  async (req: Request, res: Response) => {
    try {
      const template = await findNotificationTemplateById(req.params.id);
      if (!template) {
        return sendError(res, "Notification template not found.", 404);
      }

      const to = getOptionalString(req.body?.to);
      const delivery = await sendNotificationTemplateTest(template.id, to ?? undefined);

      return sendSuccess(res, { delivery }, { message: "Test notification sent successfully." });
    } catch (error) {
      if (
        error instanceof SmsConfigurationError ||
        error instanceof SmsDeliveryError ||
        error instanceof EmailConfigurationError ||
        error instanceof EmailDeliveryError ||
        error instanceof PushNotificationConfigurationError ||
        error instanceof PushNotificationDeliveryError
      ) {
        return sendError(res, error.message, 400);
      }

      if (error instanceof Error) {
        return sendError(res, error.message, 400);
      }

      return handleRouteError(res, error);
    }
  },
);

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
