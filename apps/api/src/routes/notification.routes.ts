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
import { getOptionalString, parseBoolean } from "../utils/validation";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

const CHANNELS = new Set<NotificationChannel>(["email", "sms"]);
const MODULES = new Set<NotificationModule>([
  "ride_requests",
  "user_registrations",
  "insurance",
  "inspection",
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
        error instanceof EmailDeliveryError
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
