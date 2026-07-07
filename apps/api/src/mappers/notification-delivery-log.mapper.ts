import type { NotificationDeliveryLog as PublicNotificationDeliveryLog } from "@smart-dispatch/types";
import type { NotificationDeliveryLog as DbNotificationDeliveryLog } from "../generated/prisma";

export function toPublicNotificationDeliveryLog(
  log: DbNotificationDeliveryLog,
): PublicNotificationDeliveryLog {
  return {
    id: log.id,
    status: log.status,
    module: log.module,
    event: log.event,
    channel: log.channel,
    recipient: log.recipient,
    template_id: log.templateId,
    entity_type: log.entityType,
    entity_id: log.entityId,
    recipient_contact: log.recipientContact,
    subject: log.subject,
    body_preview: log.bodyPreview,
    error_message: log.errorMessage,
    is_test: log.isTest,
    created_at: log.createdAt.toISOString(),
  };
}
